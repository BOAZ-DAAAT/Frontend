import { AccountStack } from '@/features/playground/account/AccountStack';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { PromptComposer } from '@/features/playground/composer/PromptComposer';
import { NodeCreator, type CreatableNodeKind } from '@/features/playground/node-editor';
import { NodeSummaryPanel } from '@/features/playground/node-summary/NodeSummaryPanel';
import { ReportWorkspace } from '@/features/playground/report/ReportWorkspace';
import { Sidebar } from '@/features/playground/sidebar/Sidebar';
import { useSidebar } from '@/features/playground/sidebar/SidebarContext';
import type { PlaygroundNodeKind } from '@/features/playground/types';
import type { NodeSummary } from '@/features/playground/node-summary/types';
import { TablePreviewPanel } from '@/features/playground/table-preview/TablePreviewPanel';
import { Toolbar } from '@/features/playground/toolbar/Toolbar';

import styles from './PlaygroundOverlay.module.css';

interface PlaygroundOverlayProps {
  isGenerating: boolean;
  onPromptSend: (prompt: string) => Promise<void>;
  clarification: {
    eventId: string | null;
    agentName: string;
    question: string;
  } | null;
  analysisReview: {
    eventId: string | null;
    agentName: string;
    content: string;
  } | null;
  isSubmittingClarification: boolean;
  clarificationError: string | null;
  onClarificationSend: (answer: string) => Promise<void>;
  approval: {
    eventId: string | null;
    agentName: string;
    reason: string;
  } | null;
  isSubmittingApproval: boolean;
  approvalError: string | null;
  onApprovalDecision: (approved: boolean) => Promise<void>;
  nodeSummary: {
    id: string;
    label: string;
    kind: PlaygroundNodeKind;
    status: 'idle' | 'running' | 'waiting' | 'success' | 'error';
  } | null;
  nodeSummaryData: NodeSummary | null;
  nodeSummaryRunId: string | null;
  nodeSummaryError: string | null;
  isNodeSummaryLoading: boolean;
  onCloseNodeSummary: () => void;
  onBranchPromptSend: (prompt: string) => Promise<void>;
  canDeleteAllNodes: boolean;
  isDeletingAllNodes: boolean;
  deleteAllNodesError: string | null;
  onDeleteAllNodes: () => Promise<void>;
  preview: { sessionId: string; table: string } | null;
  onClosePreview: () => void;
  onCreateNode: (kind: CreatableNodeKind) => void;
}

export function PlaygroundOverlay({
  isGenerating,
  onPromptSend,
  clarification,
  analysisReview,
  isSubmittingClarification,
  clarificationError,
  onClarificationSend,
  approval,
  isSubmittingApproval,
  approvalError,
  onApprovalDecision,
  nodeSummary,
  nodeSummaryData,
  nodeSummaryRunId,
  nodeSummaryError,
  isNodeSummaryLoading,
  onCloseNodeSummary,
  onBranchPromptSend,
  canDeleteAllNodes,
  isDeletingAllNodes,
  deleteAllNodesError,
  onDeleteAllNodes,
  preview,
  onClosePreview,
  onCreateNode,
}: PlaygroundOverlayProps) {
  const { activeSection, view } = useSidebar();
  const isReportWorkspaceOpen = activeSection === 'report' && view === 'navigation';

  return (
    // 캔버스 전체를 덮되, 클릭은 통과시키고(overlay: pointer-events none)
    // 실제 UI 요소(dock)에서만 클릭을 받는다(pointer-events auto)
    <div className={styles.overlay}>
      {/* 상단 중앙 고정: 툴바 */}
      <div className={styles.toolbarDock}>
        <Toolbar />
      </div>

      <div className={styles.accountDock}>
        <AccountStack />
      </div>

      <div className={styles.nodeCreatorDock}>
        <NodeCreator onCreate={onCreateNode} />
      </div>

      {isReportWorkspaceOpen && <ReportWorkspace />}

      {preview && (
        <TablePreviewPanel
          sessionId={preview.sessionId}
          table={preview.table}
          onClose={onClosePreview}
        />
      )}

      {nodeSummary && (
        <NodeSummaryPanel
          node={nodeSummary}
          summary={nodeSummaryData}
          runId={nodeSummaryRunId}
          error={nodeSummaryError}
          isLoading={isNodeSummaryLoading}
          onClose={onCloseNodeSummary}
          onBranchPromptSend={onBranchPromptSend}
        />
      )}

      {/* 좌상단 고정: 사이드바 */}
      <div className={styles.sidebarDock}>
        <Sidebar />
      </div>

      <div className={styles.deleteDock}>
        {deleteAllNodesError ? (
          <p className={styles.deleteError} role="alert">{deleteAllNodesError}</p>
        ) : null}
        <button
          type="button"
          className={styles.deleteButton}
          onClick={() => void onDeleteAllNodes()}
          disabled={!canDeleteAllNodes}
          aria-label="모든 노드와 관련 데이터 삭제"
          title="모든 노드와 관련 데이터 삭제"
        >
          {isDeletingAllNodes
            ? <LoaderCircle className={styles.deleteSpinner} aria-hidden="true" />
            : <Trash2 aria-hidden="true" />}
        </button>
      </div>

      {/* 하단 중앙 고정: 프롬프트 컴포저 */}
      <div className={`${styles.dock} ${nodeSummary ? styles.dockHidden : ''}`}>
        <PromptComposer
          isGenerating={isGenerating}
          onSend={onPromptSend}
          clarification={clarification}
          analysisReview={analysisReview}
          isSubmittingClarification={isSubmittingClarification}
          clarificationError={clarificationError}
          onClarificationSend={onClarificationSend}
          approval={approval}
          isSubmittingApproval={isSubmittingApproval}
          approvalError={approvalError}
          onApprovalDecision={onApprovalDecision}
        />
      </div>
    </div>
  );
}
