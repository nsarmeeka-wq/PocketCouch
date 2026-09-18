/**
 * The PocketCoach analysis engine.
 *
 *   video ──▶ pose provider ──▶ motion timeline ──▶ measurement modules
 *         ──▶ metric groups ──▶ weakness ranking ──▶ report
 *
 * The engine has no UI concerns and no network dependency: it accepts either a
 * real MediaPipe read or the synthetic athlete and produces the identical shape
 * of result either way.
 */
import type {
  AnalysisMetric,
  DetectedWeakness,
  DifficultyLevel,
  Measurement,
  MovementSignal,
  PoseFrames,
  RecordingQuality,
  Severity,
  SignalDefinition,
  SkillDefinition,
  SportId,
  VideoAnalysis,
} from '@/lib/types';
import { MEASURES, qualityConfidence } from '@/lib/analysis/measures';
import type { MeasureContext } from '@/lib/analysis/measures';
import { buildTimeline, detectWorkingSide, OVERLAY_FRAMES, SAMPLE_FPS } from '@/lib/pose/motion';
import { extractPoseFromVideo, downsample } from '@/lib/analysis/poseProvider';
import { CLEAN_FLAWS, deriveFlaws, simulatePoseFrames } from '@/lib/analysis/simulator';
import type { FlawSet } from '@/lib/analysis/simulator';
import { clamp, mean, visibility } from '@/lib/pose/landmarks';

export type AnalysisStageKey = 'detecting' | 'tracking' | 'angles' | 'comparing' | 'weaknesses' | 'planning';

export const ANALYSIS_STAGES: { key: AnalysisStageKey; label: string; detail: string }[] = [
  { key: 'detecting', label: 'Detecting body', detail: 'Isolating the athlete from the background' },
  { key: 'tracking', label: 'Tracking joints', detail: 'Locking onto 33 landmarks across every frame' },
  { key: 'angles', label: 'Measuring angles', detail: 'Computing joint angles, alignment and range of motion' },
  { key: 'comparing', label: 'Comparing technique', detail: 'Benchmarking against the PocketCoach model for this skill' },
  { key: 'weaknesses', label: 'Identifying weaknesses', detail: 'Ranking the movement faults that cost you the most' },
  { key: 'planning', label: 'Creating personalised drills', detail: 'Building a 15-minute session around your top faults' },
];

export class AnalysisError extends Error {
  code: string;
  friendly: string;
  constructor(code: string, friendly: string) {
    super(friendly);
    this.name = 'AnalysisError';
    this.code = code;
    this.friendly = friendly;
  }
}

export interface AnalyzeOptions {
  sport: SportId;
  skill: SkillDefinition;
  videoName: string;
  durationSec: number;
  videoEl?: HTMLVideoElement | null;
  seed?: string;
  /**
   * Signal scores the athlete is currently believed to have. The synthetic
   * athlete is driven by this profile, so demo analyses stay consistent with
   * the athlete's history and genuinely improve after training.
   */
  signalProfile?: Record<string, number>;
  /** explicit movement signature override — used by the calibration tooling */
  flawOverrides?: Partial<FlawSet>;
  onStage?: (stage: AnalysisStageKey, progress: number) => void;
  /** hard ceiling for waiting on the real pose model */
  poseBudgetMs?: number;
}

function severityFor(score: number): Severity {
  if (score < 58) return 'Critical';
  if (score < 70) return 'Needs Improvement';
  if (score < 84) return 'Minor';
  return 'Strength';
}

function estimateDifficulty(overall: number, previousLevel: number): DifficultyLevel {
  const target = overall >= 84 ? 3 : overall >= 70 ? 2 : 1;
  const blended = Math.round((target + previousLevel) / 2);
  return blended >= 3 ? 'Advanced' : blended === 2 ? 'Intermediate' : 'Beginner';
}

function qualityFromFrames(frames: PoseFrames, durationSec: number, real?: Partial<RecordingQuality>): RecordingQuality {
  const visibilities = frames.map((f) => visibility(f));
  const avgVisibility = real?.avgVisibility ?? mean(visibilities);
  const hipX = frames.map((f) => (f[23].x + f[24].x) / 2);
  const jitter = mean(hipX.slice(1).map((v, i) => Math.abs(v - hipX[i])));
  const stability = clamp(1 - jitter * 60, 0, 1);
  const head = frames[0][0];
  const feet = frames[0][32];
  const bodyHeightInFrame = Math.abs(head.y - feet.y);
  const framing: RecordingQuality['framing'] = bodyHeightInFrame < 0.42 ? 'too-far' : bodyHeightInFrame > 0.96 ? 'too-close' : 'good';
  const warnings: string[] = [...(real?.warnings ?? [])];
  if (framing === 'too-far') warnings.push('You look small in the frame — moving the camera closer will sharpen the analysis.');
  if (avgVisibility < 0.6) warnings.push('Parts of your body were hidden during the recording, which reduces confidence in the joint angles.');
  if (durationSec < 12) warnings.push('A 30-second clip gives the AI far more repetitions to work with.');
  const score = Math.round(avgVisibility * 60 + stability * 40 - (framing === 'good' ? 0 : 12));
  return {
    bodyDetected: true,
    multiplePeople: Boolean(real?.multiplePeople),
    avgVisibility,
    framing,
    lighting: real?.lighting ?? 'good',
    stability,
    durationSec,
    score: clamp(score, 0, 100),
    warnings,
  };
}

function headlineFor(overall: number): string {
  if (overall >= 88) return 'Elite mechanics';
  if (overall >= 80) return 'Strong technique';
  if (overall >= 72) return 'Solid foundation';
  if (overall >= 62) return 'Developing technique';
  return 'Fundamentals first';
}

/**
 * Run the full analysis. Always resolves unless the recording genuinely cannot
 * be analysed (no body, too short, too many people) — in which case it throws a
 * friendly `AnalysisError` the UI can show verbatim.
 */
export async function runAnalysis(options: AnalyzeOptions): Promise<VideoAnalysis> {
  const { sport, skill, onStage } = options;
  const durationSec = clamp(options.durationSec || 30, 1, 120);

  if (durationSec < 4) {
    throw new AnalysisError(
      'video-too-short',
      'That clip was too short to analyse. Record at least 10 seconds — around 30 seconds gives the best results.',
    );
  }

  onStage?.('detecting', 0.08);
  let frames: PoseFrames = [];
  let poseSource: VideoAnalysis['poseSource'] = 'simulated';
  let realQuality: Partial<RecordingQuality> | undefined;
  let backendDetail = 'Demo motion engine (no pose model available in this environment).';

  if (options.videoEl) {
    try {
      const extraction = await extractPoseFromVideo(options.videoEl, (r) => onStage?.('tracking', r), options.poseBudgetMs ?? 22000);
      if (extraction && !extraction.bodyMissing && extraction.frames.length > 6) {
        frames = extraction.frames;
        poseSource = 'mediapipe';
        backendDetail = extraction.detail;
        const multiRatio = extraction.multiPersonFrames / Math.max(extraction.frames.length, 1);
        realQuality = {
          avgVisibility: extraction.avgVisibility,
          multiplePeople: multiRatio > 0.35,
          warnings: multiRatio > 0.35 ? ['More than one person was detected in the frame — record alone for accurate analysis.'] : [],
        };
      } else if (extraction?.bodyMissing) {
        throw new AnalysisError(
          'body-not-detected',
          "We couldn't clearly detect your body. Move the camera back so your full body is in frame, and check the lighting.",
        );
      }
    } catch (error) {
      if (error instanceof AnalysisError) throw error;
      // fall through to the demo engine — never block the athlete
    }
  }

  if (!frames.length) {
    onStage?.('tracking', 0.35);
    const profile = options.signalProfile ?? {};
    const base: FlawSet = Object.keys(profile).length ? deriveFlaws(profile, skill) : CLEAN_FLAWS;
    const flaws: FlawSet = { ...base, ...options.flawOverrides };
    const simulated = simulatePoseFrames({
      skill,
      flaws,
      side: skill.id.includes('free-throw') ? 'right' : 'right',
      seed: options.seed ?? `${skill.id}-${options.videoName}`,
      durationSec,
    });
    frames = simulated.frames;
    realQuality = { avgVisibility: simulated.quality.avgVisibility, warnings: simulated.quality.warnings };
  }

  if (frames.length < 8) {
    throw new AnalysisError(
      'body-not-detected',
      "We couldn't clearly detect your body. Try moving the camera farther away and make sure your full body is visible.",
    );
  }

  onStage?.('angles', 0.55);
  const quality = qualityFromFrames(frames, durationSec, realQuality);
  const side = poseSource === 'mediapipe' ? detectWorkingSide(frames) : 'right';
  const timeline = buildTimeline(frames, skill, side, SAMPLE_FPS);
  const confidence = qualityConfidence(quality);

  const ctx: MeasureContext = { frames, timeline, side, quality };

  const signals: MovementSignal[] = skill.signals.map((definition: SignalDefinition) => {
    let measurement: Measurement;
    try {
      measurement = MEASURES[definition.measure](ctx, definition);
    } catch {
      measurement = { value: 0, score: 70, detail: 'This measurement could not be completed for this clip.' };
    }
    const score = clamp(Math.round(measurement.score * confidence + 62 * (1 - confidence)), 12, 100);
    const phaseKey = definition.phase === 'whole-movement' ? 'release' : definition.phase;
    const phaseFrames = timeline.phases[phaseKey as keyof typeof timeline.phases] ?? timeline.phases.release;
    return {
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      ideal: definition.ideal,
      phase: definition.phase,
      joints: definition.joints,
      weight: definition.weight,
      score,
      value: measurement.value,
      detail: measurement.detail,
      phaseScore: clamp(Math.round(avgPhaseScore(score, phaseFrames, timeline.phases.release)), 0, 100),
    };
  });

  onStage?.('comparing', 0.72);
  const metrics: AnalysisMetric[] = skill.metricGroups.map((group) => {
    const totalWeight = group.signals.reduce((sum, s) => sum + s.weight, 0);
    const score = group.signals.reduce((sum, s) => {
      const signal = signals.find((x) => x.key === s.key);
      return sum + (signal?.score ?? 70) * s.weight;
    }, 0) / (totalWeight || 1);
    return { key: group.key, label: group.label, score: Math.round(score), blurb: group.blurb };
  });

  const overallWeight = skill.metricGroups.reduce((sum, g) => sum + g.signals.reduce((s, x) => s + x.weight, 0), 0);
  const overall = Math.round(
    skill.metricGroups.reduce((sum, g) => {
      const metric = metrics.find((m) => m.key === g.key);
      const weight = g.signals.reduce((s, x) => s + x.weight, 0);
      return sum + (metric?.score ?? 70) * weight;
    }, 0) / (overallWeight || 1),
  );

  onStage?.('weaknesses', 0.88);
  const weaknesses = detectWeaknesses(signals, skill);
  const top = weaknesses[0];

  onStage?.('planning', 0.97);
  const narrative = top
    ? `${top.issue} ${top.whyItMatters ? top.whyItMatters.split('.')[0] + '.' : ''} Your next session leads with ${top.title.toLowerCase()} work.`
    : `Your technique is holding together across every metric. Today we push intensity instead of correcting faults.`;

  const analysis: VideoAnalysis = {
    id: `analysis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    userId: 'local-athlete',
    sport,
    skill: skill.id,
    skillName: skill.name,
    createdAt: new Date().toISOString(),
    videoName: options.videoName,
    videoDurationSec: durationSec,
    videoRetained: false,
    overall,
    metrics,
    signals,
    weaknesses,
    poseSource,
    frameCount: frames.length,
    quality,
    landmarkFrames: downsample(frames, OVERLAY_FRAMES),
    overlayFps: SAMPLE_FPS,
    headline: headlineFor(overall),
    narrative,
    difficultyEstimate: estimateDifficulty(overall, 2),
  };

  void backendDetail;
  return analysis;
}

function avgPhaseScore(score: number, phaseFrame: number, releaseFrame: number): number {
  // nearby phases are highly correlated; this keeps the phase readout honest
  const distance = Math.abs(phaseFrame - releaseFrame);
  return score - clamp(distance * 0.4, 0, 6);
}

export function detectWeaknesses(signals: MovementSignal[], skill: SkillDefinition): DetectedWeakness[] {
  const ranked = [...signals].sort((a, b) => a.score - b.score);
  const flagged = ranked.filter((s) => s.score < 86).slice(0, 4);
  const pool = flagged.length ? flagged : ranked.slice(0, 1);
  return pool.map((signal, index) => {
    const definition = skill.signals.find((s) => s.key === signal.key);
    return {
      id: `weakness-${signal.key}`,
      signalKey: signal.key,
      title: signal.label,
      score: signal.score,
      severity: severityFor(signal.score),
      issue: signal.detail,
      whyItMatters: definition?.whyItMatters ?? '',
      correction: definition?.correction ?? '',
      joints: signal.joints,
      priority: Math.round((100 - signal.score) * (definition?.weight ?? 1) * 10) / 10,
      rank: index + 1,
    };
  });
}

/** Compare two analyses of the same skill — powers before/after and progress. */
export interface ComparisonRow {
  /**
   * Stable row identity. Namespaced by source (`metric:` / `signal:`) because a
   * skill can reuse the same name for a metric and one of its signals —
   * basketball's jump shot has both a `balance` metric and a `balance` signal,
   * and un-namespaced keys collide as React list keys (rows silently dropped).
   */
  key: string;
  /** what the athlete reads: the metric or signal label */
  label: string;
  source: 'metric' | 'signal';
  before: number;
  after: number;
  delta: number;
}

export function compareAnalyses(before: VideoAnalysis, after: VideoAnalysis): { rows: ComparisonRow[]; overallBefore: number; overallAfter: number; delta: number } {
  const rows: ComparisonRow[] = after.metrics.map((metric) => {
    const previous = before.metrics.find((m) => m.key === metric.key);
    const beforeScore = previous?.score ?? metric.score;
    return {
      key: `metric:${metric.key}`,
      label: metric.label,
      source: 'metric' as const,
      before: beforeScore,
      after: metric.score,
      delta: metric.score - beforeScore,
    };
  });
  const signalRows: ComparisonRow[] = after.signals
    .filter((s) => before.signals.some((b) => b.key === s.key))
    .map((signal) => {
      const previous = before.signals.find((b) => b.key === signal.key);
      return {
        key: `signal:${signal.key}`,
        label: signal.label,
        source: 'signal' as const,
        before: previous?.score ?? signal.score,
        after: signal.score,
        delta: signal.score - (previous?.score ?? signal.score),
      };
    })
    .filter((row) => row.delta !== 0)
    .sort((a, b) => b.delta - a.delta);
  return {
    rows: [...signalRows.slice(0, 3), ...rows],
    overallBefore: before.overall,
    overallAfter: after.overall,
    delta: after.overall - before.overall,
  };
}

/**
 * The rows worth putting in front of the athlete after a session: the technique
 * signals that actually moved. A metric row is a weighted blend of those
 * signals, so listing both prints the same name twice with two different
 * numbers. Falls back to the metric summary when nothing moved at all.
 */
export function improvementRows(rows: ComparisonRow[], limit = 4): ComparisonRow[] {
  const signals = rows.filter((row) => row.source === 'signal');
  const moved = signals.filter((row) => row.delta !== 0);
  const pool = moved.length ? moved : signals.length ? signals : rows;
  return pool.slice(0, limit);
}
