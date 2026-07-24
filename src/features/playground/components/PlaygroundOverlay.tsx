import { useEffect } from 'react';

import { AccountStack } from '@/features/playground/account/AccountStack';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { PromptComposer } from '@/features/playground/composer/PromptComposer';
import { NodeCreator, type CreatableNodeKind } from '@/features/playground/node-editor';
import { NodeSummaryPanel } from '@/features/playground/node-summary/NodeSummaryPanel';
import { GeneratedReportPanel } from '@/features/playground/report/GeneratedReportPanel';
import { ReportWorkspace } from '@/features/playground/report/ReportWorkspace';
import type { AgentNodeReportResponse } from '@/features/playground/report/types';
import { Sidebar } from '@/features/playground/sidebar/Sidebar';
import { useSidebar } from '@/features/playground/sidebar/SidebarContext';
import { SessionConnectPanel } from '@/features/session/connect/SessionConnectPanel';
import type { PlaygroundNodeKind } from '@/features/playground/types';
import type { NodeSummary } from '@/features/playground/node-summary/types';
import { TablePreviewPanel } from '@/features/playground/table-preview/TablePreviewPanel';
import { Toolbar } from '@/features/playground/toolbar/Toolbar';

import styles from './PlaygroundOverlay.module.css';

interface PlaygroundOverlayProps {
  isGenerating: boolean;
  canStop: boolean;
  isStopping: boolean;
  stopError: string | null;
  onStop: () => Promise<void>;
  onPromptSend: (prompt: string) => Promise<void>;
  clarification: {
    eventId: string | null;
    requestKey: string;
    agentName: string;
    question: string;
  } | null;
  analysisReview: {
    eventId: string | null;
    requestKey: string;
    approvalId: string;
    agentName: string;
    content: string;
    options: Array<{
      id: string;
      label: string;
      recommended: boolean;
    }>;
    allowFreeText: boolean;
  } | null;
  isSubmittingAnalysisReview: boolean;
  analysisReviewError: string | null;
  onAnalysisReviewDecision: (
    selection: { selectedOptionId?: string; freeText?: string },
  ) => Promise<void>;
  isSubmittingClarification: boolean;
  clarificationError: string | null;
  onClarificationSend: (answer: string) => Promise<void>;
  approval: {
    eventId: string | null;
    requestKey: string;
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
    status: 'selecting' | 'idle' | 'running' | 'waiting' | 'success' | 'error';
  } | null;
  nodeSummaryData: NodeSummary | null;
  nodeSummaryRunId: string | null;
  nodeSummaryError: string | null;
  isNodeSummaryLoading: boolean;
  onCloseNodeSummary: () => void;
  generatedReport: AgentNodeReportResponse | null;
  generatedReportError: string | null;
  isGeneratingReport: boolean;
  onCloseGeneratedReport: () => void;
  onBranchPromptSend: (prompt: string) => Promise<void>;
  canDeleteAllNodes: boolean;
  isDeletingAllNodes: boolean;
  deleteAllNodesError: string | null;
  onDeleteAllNodes: () => Promise<void>;
  preview: { sessionId: string; table: string } | null;
  onClosePreview: () => void;
  onCreateNode: (kind: CreatableNodeKind) => void;
  isLeavingForSessions: boolean;
  isEnteringFromSessions: boolean;
}

export function PlaygroundOverlay({
  isGenerating,
  canStop,
  isStopping,
  stopError,
  onStop,
  onPromptSend,
  clarification,
  analysisReview,
  isSubmittingAnalysisReview,
  analysisReviewError,
  onAnalysisReviewDecision,
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
  generatedReport,
  generatedReportError,
  isGeneratingReport,
  onCloseGeneratedReport,
  onBranchPromptSend,
  canDeleteAllNodes,
  isDeletingAllNodes,
  deleteAllNodesError,
  onDeleteAllNodes,
  preview,
  onClosePreview,
  onCreateNode,
  isLeavingForSessions,
  isEnteringFromSessions,
}: PlaygroundOverlayProps) {
  const { activeSection, closeSessionCreate, selectSession, sessionPane, view } = useSidebar();
  const isReportWorkspaceOpen = activeSection === 'report' && view === 'navigation';
  const isSessionView = view === 'sessions';

  useEffect(() => {
    if (isReportWorkspaceOpen && preview) {
      onClosePreview();
    }
  }, [isReportWorkspaceOpen, onClosePreview, preview]);

  return (
    // 캔버스 전체를 덮되, 클릭은 통과시키고(overlay: pointer-events none)
    // 실제 UI 요소(dock)에서만 클릭을 받는다(pointer-events auto)
    <div
      className={`${styles.overlay} ${
        isLeavingForSessions ? styles.leavingForSessions : ''
      } ${isEnteringFromSessions ? styles.enteringFromSessions : ''}`}
    >
      {/* 상단 중앙 고정: 툴바 */}
      {!isSessionView ? <div className={styles.toolbarDock}><Toolbar /></div> : null}

      {!isSessionView ? <div className={styles.accountDock}><AccountStack /></div> : null}

      {!isSessionView ? <div className={styles.nodeCreatorDock}><NodeCreator onCreate={onCreateNode} /></div> : null}

      {!isSessionView && isReportWorkspaceOpen ? <ReportWorkspace /> : null}

      {!isSessionView && (generatedReport || generatedReportError || isGeneratingReport) ? (
        <GeneratedReportPanel
          data={generatedReport}
          error={generatedReportError}
          isLoading={isGeneratingReport}
          onClose={onCloseGeneratedReport}
        />
      ) : null}

      {!isSessionView && !isReportWorkspaceOpen && preview ? (
        <TablePreviewPanel
          sessionId={preview.sessionId}
          table={preview.table}
          onClose={onClosePreview}
        />
      ) : null}

      {!isSessionView && nodeSummary ? (
        <NodeSummaryPanel
          node={nodeSummary}
          summary={nodeSummaryData}
          runId={nodeSummaryRunId}
          error={nodeSummaryError}
          isLoading={isNodeSummaryLoading}
          onClose={onCloseNodeSummary}
          onBranchPromptSend={onBranchPromptSend}
        />
      ) : null}

      {/* 좌상단 고정: 사이드바 */}
      <div className={styles.sidebarDock}>
        <Sidebar />
      </div>

      {isSessionView && sessionPane === 'create' ? (
        <div className={styles.sessionConnectDock}>
          <SessionConnectPanel onClose={closeSessionCreate} onSessionCreated={selectSession} />
        </div>
      ) : null}

      {!isSessionView ? <div className={styles.deleteDock}>
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
      </div> : null}

      {/* 하단 중앙 고정: 프롬프트 컴포저 */}
      {!isSessionView ? <div className={`${styles.dock} ${nodeSummary ? styles.dockHidden : ''}`}>
        <PromptComposer
          isGenerating={isGenerating}
          canStop={canStop}
          isStopping={isStopping}
          stopError={stopError}
          onStop={onStop}
          onSend={onPromptSend}
          clarification={clarification}
          analysisReview={analysisReview}
          isSubmittingAnalysisReview={isSubmittingAnalysisReview}
          analysisReviewError={analysisReviewError}
          onAnalysisReviewDecision={onAnalysisReviewDecision}
          isSubmittingClarification={isSubmittingClarification}
          clarificationError={clarificationError}
          onClarificationSend={onClarificationSend}
          approval={approval}
          isSubmittingApproval={isSubmittingApproval}
          approvalError={approvalError}
          onApprovalDecision={onApprovalDecision}
        />
      </div> : null}
    </div>
  );
}
