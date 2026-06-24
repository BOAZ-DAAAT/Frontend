import { apiClient } from '@/lib/apiClient';

import type { ApprovalDecision, ApprovalSummary } from './types';

export function listPendingApprovals() {
  return apiClient.post<ApprovalSummary[]>('/approvals/pending', {});
}

export function getApproval(approvalId: string) {
  return apiClient.post<ApprovalSummary>('/approvals/get', { approval_id: approvalId });
}

export function resolveApproval(approvalId: string, decision: ApprovalDecision, editedPayload?: Record<string, unknown>) {
  return apiClient.post<ApprovalSummary>('/approvals/resolve', {
    approval_id: approvalId,
    decision,
    edited_payload: editedPayload,
  });
}
