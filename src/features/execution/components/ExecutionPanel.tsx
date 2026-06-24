import { ExecutionInput } from '@/features/execution/components/ExecutionInput';
import { ExecutionResult } from '@/features/execution/components/ExecutionResult';

export function ExecutionPanel() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <ExecutionInput />
      <ExecutionResult />
    </div>
  );
}
