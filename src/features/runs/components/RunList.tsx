import { EmptyState } from '@/components/common/EmptyState';

export function RunList() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <h3 className="text-lg font-semibold text-white">실행 목록</h3>
      <p className="mt-2 text-sm text-slate-400">에이전트 실행 이력이 표시됩니다.</p>
      <div className="mt-6">
        <EmptyState title="실행 기록이 없습니다" description="분석 작업을 시작하면 실행 기록이 생성됩니다." />
      </div>
    </div>
  );
}
