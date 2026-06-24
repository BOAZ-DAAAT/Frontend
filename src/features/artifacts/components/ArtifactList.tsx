import { EmptyState } from '@/components/common/EmptyState';

export function ArtifactList() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <h3 className="text-lg font-semibold text-white">결과물 목록</h3>
      <p className="mt-2 text-sm text-slate-400">생성된 결과물이 표시됩니다.</p>
      <div className="mt-6">
        <EmptyState title="결과물이 없습니다" description="에이전트 실행 후 생성된 결과물이 이곳에 표시됩니다." />
      </div>
    </div>
  );
}
