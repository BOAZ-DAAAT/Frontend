export type RunStatus =
  | 'created'
  | 'running'
  | 'waiting_approval'
  | 'waiting_input'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type RunCreatePayload = {
  run_id?: string;
  thread_id?: string;
  project_id?: string;
  metadata?: Record<string, unknown>;
};

export type RunSummary = {
  run_id: string;
  thread_id?: string | null;
  project_id?: string | null;
  status: RunStatus;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type RunEvent = {
  event_id?: string;
  run_id: string;
  event_type: string;
  message: string;
  node_name?: string | null;
  tool_name?: string | null;
  artifact_ids?: string[];
  approval_id?: string | null;
  memory_ids?: string[];
  metadata?: Record<string, unknown>;
  created_at?: string;
};
