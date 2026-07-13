import { ExecutionInput } from '@/features/execution/components/ExecutionInput';
import { ExecutionResult } from '@/features/execution/components/ExecutionResult';
import { useExecution } from '@/features/execution/hooks';

export function ExecutionPanel() {
  const execution = useExecution();

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <ExecutionInput
        query={execution.query}
        isSubmitting={execution.isSubmitting}
        error={execution.error}
        onQueryChange={execution.setQuery}
        onSubmit={() => {
          void execution.submit();
        }}
      />
      <ExecutionResult run={execution.run} events={execution.events} />
    </div>
  );
}
