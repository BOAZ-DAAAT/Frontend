import { EmptyState } from '@/components/common/EmptyState';

export function ApprovalList() {
  return <EmptyState title="승인 대기 작업이 없습니다" description="검토가 필요한 작업이 생기면 이곳에 표시됩니다." />;
}
