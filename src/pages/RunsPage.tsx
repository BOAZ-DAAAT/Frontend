import { RunEventTimeline } from '@/features/runs/components/RunEventTimeline';
import { RunList } from '@/features/runs/components/RunList';

export function RunsPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-100">Runs</p>
        <h2 className="mt-2 text-3xl font-bold text-white">실행 기록</h2>
        <p className="mt-3 text-slate-400">에이전트 실행 상태와 이벤트 로그를 추적합니다.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <RunList />
        <RunEventTimeline />
      </div>
    </section>
  );
}
