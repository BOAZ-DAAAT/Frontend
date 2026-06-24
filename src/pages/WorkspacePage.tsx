import { ExecutionPanel } from '@/features/execution/components/ExecutionPanel';

export function WorkspacePage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-100">Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-white">분석 작업 공간</h2>
        <p className="mt-3 text-slate-400">사용자의 분석 요청을 입력하고 에이전트 실행 흐름을 확인합니다.</p>
      </div>

      <ExecutionPanel />
    </section>
  );
}
