/**
 * PocketCoach AI — shared domain types.
 *
 * The product is built around one loop:
 *   VIDEO → ANALYSIS → WEAKNESS → ADAPTIVE DRILLS → TRAIN → RE-TEST → IMPROVEMENT
 * Every type below carries one step of that loop.
 */

export type SportId = 'basketball' | 'football' | 'fitness';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type Severity = 'Critical' | 'Needs Improvement' | 'Minor' | 'Strength';

export type MovementPhase =
  | 'setup'
  | 'load'
  | 'execution'
  | 'release'
  | 'recovery'
  | 'whole-movement';

export type PoseSource = 'mediapipe' | 'simulated';

/* ------------------------------------------------------------------ *
 * Pose data
 * ------------------------------------------------------------------ */

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** A single analysed video, sampled down to a manageable number of frames. */
export type PoseFrames = Landmark[][];

export interface Rep {
  start: number;
  peak: number;
  end: number;
}

export interface MotionTimeline {
  /** frame index ranges for each phase of one representative rep */
  phases: { setup: number; load: number; execution: number; release: number; recovery: number };
  reps: Rep[];
  /** frames per second of the sampled pose stream */
  fps: number;
  durationSec: number;
  /** normalised 0..1 ground-relative vertical motion of the hips, per frame */
  hipTrace: number[];
  activityTrace: number[];
}

/* ------------------------------------------------------------------ *
 * Skill / signal definitions — the modular analysis rulebook
 * ------------------------------------------------------------------ */

export type MeasureKey =
  | 'elbowAlignment'
  | 'elbowTuck'
  | 'kneeFlexion'
  | 'kneeValgus'
  | 'followThroughHold'
  | 'wristSnapshot'
  | 'shoulderSquareness'
  | 'comSway'
  | 'footWorkStability'
  | 'jumpSymmetry'
  | 'repConsistency'
  | 'tempoRegularity'
  | 'torsoLean'
  | 'hipDepth'
  | 'legDrive'
  | 'footOrientation'
  | 'upperBodyControl'
  | 'cadenceControl'
  | 'baseWidth'
  | 'bodyLine';

export interface SignalDefinition {
  key: string;
  /** What we call this measurement in the report. */
  label: string;
  /** Which measurement module computes it. */
  measure: MeasureKey;
  unit: string;
  /** Human readable ideal target, shown under the angle readout. */
  ideal: string;
  phase: MovementPhase;
  /** Joints highlighted on the video overlay when this signal is the problem. */
  joints: string[];
  /** Signal used by the drill library + recommendation engine. */
  weight: number;
  /** Skill specific targets handed to the measurement module. */
  params?: Record<string, number>;
  whyItMatters: string;
  correction: string;
}

export interface MetricGroupDefinition {
  key: string;
  label: string;
  blurb: string;
  signals: { key: string; weight: number }[];
}

export interface SkillDefinition {
  id: string;
  sport: SportId;
  name: string;
  emoji: string;
  tagline: string;
  /** Primary coaching focus shown on the card. */
  focus: string;
  /** Ideal camera framing for this skill. */
  cameraTip: string;
  defaultDifficulty: DifficultyLevel;
  signals: SignalDefinition[];
  metricGroups: MetricGroupDefinition[];
  /** Short recording checklist specific to the skill. */
  cueList: string[];
  /** Indicator used for rep segmentation. */
  repIndicator: 'hipVertical' | 'wristVertical' | 'kneeVertical';
}

export interface SportDefinition {
  id: SportId;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  /** Tailwind classes for the card accent. */
  accent: string;
  accentSoft: string;
  skills: SkillDefinition[];
}

/* ------------------------------------------------------------------ *
 * Analysis
 * ------------------------------------------------------------------ */

export interface Measurement {
  /** raw measured value in `unit` */
  value: number;
  /** secondary measurement used for the angle badge, when relevant */
  secondary?: number;
  score: number;
  detail: string;
  note?: string;
}

export interface MovementSignal {
  key: string;
  label: string;
  unit: string;
  ideal: string;
  phase: MovementPhase;
  joints: string[];
  /** importance of this signal for the skill (from the rulebook) */
  weight: number;
  score: number;
  value: number;
  detail: string;
  phaseScore: number;
}

export interface AnalysisMetric {
  key: string;
  label: string;
  score: number;
  blurb: string;
}

export interface DetectedWeakness {
  id: string;
  signalKey: string;
  title: string;
  score: number;
  severity: Severity;
  issue: string;
  whyItMatters: string;
  correction: string;
  joints: string[];
  /** 0 = not a priority, 1 = top priority */
  priority: number;
  rank: number;
}

export interface RecordingQuality {
  bodyDetected: boolean;
  multiplePeople: boolean;
  avgVisibility: number;
  framing: 'good' | 'too-far' | 'too-close';
  lighting: 'good' | 'dim';
  stability: number;
  durationSec: number;
  score: number;
  warnings: string[];
}

export interface VideoAnalysis {
  id: string;
  userId: string;
  sport: SportId;
  skill: string;
  skillName: string;
  createdAt: string;
  videoName: string;
  videoDurationSec: number;
  videoRetained: boolean;
  overall: number;
  metrics: AnalysisMetric[];
  signals: MovementSignal[];
  weaknesses: DetectedWeakness[];
  poseSource: PoseSource;
  frameCount: number;
  quality: RecordingQuality;
  /** down-sampled landmark frames used for the skeleton overlay */
  landmarkFrames: PoseFrames;
  overlayFps: number;
  headline: string;
  narrative: string;
  difficultyEstimate: DifficultyLevel;
}

/* ------------------------------------------------------------------ *
 * Drills & workouts
 * ------------------------------------------------------------------ */

export interface DrillDefinition {
  id: string;
  name: string;
  sport: SportId | 'any';
  /** signal keys this drill repairs */
  targetSignals: string[];
  /** when set, the drill is written specifically for these skill ids */
  skills?: string[];
  targetLabel: string;
  difficulty: DifficultyLevel;
  durationMin: number;
  intensity: 1 | 2 | 3;
  equipment: string[];
  setup: string;
  steps: string[];
  coachingCue: string;
  volume: string;
}

export interface WorkoutDrill {
  drillId: string;
  name: string;
  durationMin: number;
  targetLabel: string;
  targetSignals: string[];
  difficulty: DifficultyLevel;
  intensity: 1 | 2 | 3;
  equipment: string[];
  setup: string;
  steps: string[];
  coachingCue: string;
  volume: string;
  /** explains *why this athlete* got this drill */
  reason: string;
  completed: boolean;
  completedAt?: string;
}

export interface Workout {
  id: string;
  userId: string;
  sport: SportId;
  skill: string;
  skillName: string;
  createdAt: string;
  completedAt?: string;
  completed: boolean;
  difficulty: DifficultyLevel;
  /** 1..6 adaptive difficulty ladder */
  difficultyLevel: number;
  totalMinutes: number;
  drills: WorkoutDrill[];
  focusSignals: string[];
  rootCauses: string[];
  generatedReason: string;
  baselineAnalysisId: string;
  baselineOverall: number;
  xpEarned: number;
}

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

export interface ProgressEntry {
  id: string;
  userId: string;
  sport: SportId;
  skill: string;
  metricKey: string;
  metricLabel: string;
  score: number;
  overall: number;
  analysisId: string;
  timestamp: string;
}

export interface SessionLog {
  id: string;
  userId: string;
  workoutId: string;
  minutes: number;
  xp: number;
  completedAt: string;
  sport: SportId;
  skill: string;
}

/* ------------------------------------------------------------------ *
 * Gamification
 * ------------------------------------------------------------------ */

export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export interface BadgeAward extends BadgeDefinition {
  earnedAt: string;
}

/* ------------------------------------------------------------------ *
 * User
 * ------------------------------------------------------------------ */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarEmoji: string;
  goalSkill: string;
  goalSport: SportId;
  selectedSports: SportId[];
  /** skillId -> 1..6 ladder position */
  skillLevels: Record<string, number>;
  xp: number;
  streak: number;
  lastActiveDate: string;
  badges: BadgeAward[];
  createdAt: string;
  keepVideos: boolean;
  onboarded: boolean;
}

/* ------------------------------------------------------------------ *
 * AI coach
 * ------------------------------------------------------------------ */

export interface CoachMessage {
  id: string;
  role: 'coach' | 'athlete';
  text: string;
  createdAt: string;
  /** optional structured blocks rendered under the bubble */
  chips?: string[];
  metrics?: { label: string; value: string }[];
}

/* ------------------------------------------------------------------ *
 * App-level
 * ------------------------------------------------------------------ */

export interface AppState {
  user: UserProfile;
  analyses: VideoAnalysis[];
  workouts: Workout[];
  progress: ProgressEntry[];
  sessions: SessionLog[];
  messages: CoachMessage[];
  theme: 'dark' | 'light';
}

export interface WeaknessSummary {
  signalKey: string;
  label: string;
  latest: number;
  previous?: number;
  delta: number;
  history: number[];
  joints: string[];
  severity: Severity;
}
