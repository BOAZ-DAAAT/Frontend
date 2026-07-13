import type { RunEvent, RunStatus, RunSummary } from '@/features/runs/types';

export type AgentRunCreatePayload = {
  sessionId: string;
  query: string;
};

export type AgentRunCreateResult = {
  run_id: string;
  thread_id: string;
  status: RunStatus;
  query: string;
  session_id: string;
};

export type ExecutionState = {
  query: string;
  run: RunSummary | null;
  events: RunEvent[];
  isSubmitting: boolean;
  error: string | null;
};
