import { cn } from '@/lib/utils';

import type { RunStatus } from '../types';

type RunStatusBadgeProps = {
  status: RunStatus;
};

const statusClassNames: Record<RunStatus, string> = {
  created: 'border-slate-400/30 bg-slate-400/10 text-slate-200',
  running: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
  waiting_approval: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  waiting_input: 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200',
  succeeded: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  failed: 'border-red-400/30 bg-red-400/10 text-red-200',
  cancelled: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
};

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  return (
    <span className={cn('rounded-full border px-3 py-1 text-xs font-medium', statusClassNames[status])}>
      {status}
    </span>
  );
}
