import { EmptyState } from '@/components/common/EmptyState';

export function ExecutionResult() {
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
