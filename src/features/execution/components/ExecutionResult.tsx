import { EmptyState } from '@/components/common/EmptyState';
import { RunStatusBadge } from '@/features/runs/components/RunStatusBadge';
import type { RunEvent, RunSummary } from '@/features/runs/types';

type ExecutionResultProps = {
  run: RunSummary | null;
  events: RunEvent[];
};

export function ExecutionResult({ run, events }: ExecutionResultProps) {
  if (!run) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-lg font-semibold text-white">실행 결과</h3>
        <p className="mt-2 text-sm text-slate-400">에이전트 응답과 실행 결과를 표시합니다.</p>
        <div className="mt-6">
          <EmptyState title="아직 실행 결과가 없습니다" description="분석 요청을 실행하면 결과가 이곳에 표시됩니다." />
        </div>
      </div>
    );
  }

  const latestEvent = events[events.length - 1] ?? null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">실행 결과</h3>
        <RunStatusBadge status={run.status} />
      </div>
      <p className="mt-2 text-sm text-slate-400">에이전트 응답과 실행 결과를 표시합니다.</p>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Run</p>
          <p className="mt-2 font-mono text-sm text-slate-200">{run.run_id}</p>
          {latestEvent && <p className="mt-3 text-sm text-slate-300">{latestEvent.message}</p>}
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Recent Events</p>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">이벤트를 기다리는 중입니다.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {events.slice(-5).reverse().map((event) => (
                <div key={event.event_id ?? `${event.event_type}-${event.created_at}`} className="border-l border-white/10 pl-3">
                  <p className="text-sm text-slate-200">{event.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {event.node_name ? `${event.node_name} · ` : ''}
                    {event.event_type}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
