import { useCallback, useRef, useState } from 'react';
import { ANALYSIS_STAGES, AnalysisError, runAnalysis, type AnalysisStageKey, type AnalyzeOptions } from '@/lib/analysis/engine';
import type { VideoAnalysis } from '@/lib/types';

export interface StagedAnalysisState {
  running: boolean;
  stage: AnalysisStageKey;
  stageIndex: number;
  progress: number;
  waitingOnEngine: boolean;
  error?: { code: string; message: string };
}

const INITIAL: StagedAnalysisState = {
  running: false,
  stage: 'detecting',
  stageIndex: 0,
  progress: 0,
  waitingOnEngine: false,
};

/**
 * Runs the analysis engine while pacing the six on-screen stages so the athlete
 * can actually read what the AI is doing. If the engine is slower (real
 * MediaPipe on a long clip) the animation simply waits on the final stage.
 */
export function useStagedAnalysis() {
  const [state, setState] = useState<StagedAnalysisState>(INITIAL);
  const cancelled = useRef(false);

  const reset = useCallback(() => {
    cancelled.current = false;
    setState(INITIAL);
  }, []);

  const run = useCallback(
    async (options: AnalyzeOptions, stageMs = 950): Promise<VideoAnalysis | null> => {
      cancelled.current = false;
      setState({ ...INITIAL, running: true });

      const engineHandle: { stage: AnalysisStageKey; done: boolean; error: unknown } = { stage: 'detecting', done: false, error: undefined };

      const enginePromise = runAnalysis({
        ...options,
        onStage: (stage, progress) => {
          engineHandle.stage = stage;
          options.onStage?.(stage, progress);
        },
      })
        .catch((error: unknown) => {
          engineHandle.error = error;
          return null;
        })
        .then((result) => {
          engineHandle.done = true;
          return result;
        });

      for (let index = 0; index < ANALYSIS_STAGES.length; index += 1) {
        if (cancelled.current) break;
        const stageKey = ANALYSIS_STAGES[index].key;
        setState((prev) => ({
          ...prev,
          running: true,
          stage: engineHandle.done && engineHandle.stage === stageKey ? engineHandle.stage : stageKey,
          stageIndex: index,
          progress: Math.max(prev.progress, index / ANALYSIS_STAGES.length),
          waitingOnEngine: !engineHandle.done && index === ANALYSIS_STAGES.length - 1,
        }));
        await new Promise((resolve) => setTimeout(resolve, stageMs));
      }

      // hold on the final stage until the engine is actually finished
      const started = Date.now();
      while (!engineHandle.done && Date.now() - started < 30000) {
        setState((prev) => ({ ...prev, waitingOnEngine: true, stage: engineHandle.stage, progress: Math.max(prev.progress, 0.97) }));
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      const engineResult = await enginePromise;

      if (engineHandle.error || !engineResult) {
        const friendly =
          engineHandle.error instanceof AnalysisError
            ? { code: engineHandle.error.code, message: engineHandle.error.friendly }
            : { code: 'engine-failure', message: 'Something interrupted the analysis. Your clip is safe — tap Analyse again to retry.' };
        setState((prev) => ({ ...prev, running: false, error: friendly }));
        return null;
      }

      setState((prev) => ({ ...prev, running: false, progress: 1 }));
      return engineResult;
    },
    [],
  );

  const clearError = useCallback(() => setState((prev) => ({ ...prev, error: undefined })), []);

  return { ...state, run, reset, clearError };
}
