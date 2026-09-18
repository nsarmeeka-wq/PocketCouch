import { Check, Loader2 } from 'lucide-react';
import { ANALYSIS_STAGES } from '@/lib/analysis/engine';
import { cn } from '@/lib/cn';

/** The six analysis stages with live progress ticks. */
export function AnalysisStageList({
  stageIndex,
  progress,
  waiting,
}: {
  stageIndex: number;
  progress: number;
  waiting: boolean;
}) {
  return (
    <ul className="space-y-2.5">
      {ANALYSIS_STAGES.map((stage, index) => {
        const done = index < stageIndex || progress >= 1;
        const active = index === stageIndex && !done;
        return (
          <li key={stage.key} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition',
                done
                  ? 'border-lime-400/50 bg-lime-400/15 text-lime-300'
                  : active
                    ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200'
                    : 'border-[rgb(var(--line)/0.16)] text-muted',
              )}
            >
              {done ? <Check size={13} /> : active ? <Loader2 size={12} className="animate-spin" /> : index + 1}
            </span>
            <span className={cn(done || active ? 'text-strong' : 'text-muted', active && 'font-semibold')}>{stage.label}</span>
            {active && (
              <span className="ml-auto hidden text-[11px] text-cyan-300 sm:block">
                {waiting ? 'running pose model…' : stage.detail.slice(0, 42)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
