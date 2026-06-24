import { ArtifactList } from '@/features/artifacts/components/ArtifactList';
import { ArtifactViewer } from '@/features/artifacts/components/ArtifactViewer';

export function ArtifactsPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-100">Artifacts</p>
        <h2 className="mt-2 text-3xl font-bold text-white">분석 결과물</h2>
        <p className="mt-3 text-slate-400">분석 과정에서 생성된 데이터셋, 차트, 리포트를 확인합니다.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <ArtifactList />
        <ArtifactViewer />
      </div>
    </section>
  );
}
