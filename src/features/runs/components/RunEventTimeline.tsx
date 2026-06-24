import { EmptyState } from '@/components/common/EmptyState';

export function RunEventTimeline() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <h3 className="text-lg font-semibold text-white">이벤트 타임라인</h3>
      <p className="mt-2 text-sm text-slate-400">선택한 실행의 이벤트 로그를 표시합니다.</p>
      <div className="mt-6">
        <EmptyState title="선택된 실행이 없습니다" description="실행 항목을 선택하면 이벤트 흐름을 확인할 수 있습니다." />
      </div>
    </div>
  );
}
