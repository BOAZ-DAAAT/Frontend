export type ApprovalDecision = 'approved' | 'rejected' | 'edited';

export type ApprovalSummary = {
  approval_id: string;
  title?: string;
  message?: string;
  payload?: Record<string, unknown>;
  created_at?: string;
};
