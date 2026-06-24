import { EmptyState } from '@/components/common/EmptyState';

export function ArtifactViewer() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <h3 className="text-lg font-semibold text-white">결과물 미리보기</h3>
      <p className="mt-2 text-sm text-slate-400">선택한 결과물의 내용을 표시합니다.</p>
      <div className="mt-6">
        <EmptyState title="선택된 결과물이 없습니다" description="결과물을 선택하면 미리보기를 확인할 수 있습니다." />
      </div>
    </div>
  );
}
