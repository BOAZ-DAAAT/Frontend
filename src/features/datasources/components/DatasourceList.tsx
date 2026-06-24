import { EmptyState } from '@/components/common/EmptyState';

export function DatasourceList() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">연결 목록</h3>
        <p className="mt-2 text-sm text-slate-400">등록된 데이터소스가 이곳에 표시됩니다.</p>
      </div>

      <EmptyState title="아직 연결된 데이터소스가 없습니다" description="새 데이터소스를 등록하면 목록에서 확인할 수 있습니다." />
    </div>
  );
}
