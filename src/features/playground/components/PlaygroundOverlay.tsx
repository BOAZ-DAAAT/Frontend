import { AccountStack } from '@/features/playground/account/AccountStack';
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
  isSubmittingClarification: boolean;
  clarificationError: string | null;
  onClarificationSend: (answer: string) => Promise<void>;
  nodeSummary: {
    id: string;
    label: string;
    kind: PlaygroundNodeKind;
    status: 'idle' | 'running' | 'waiting' | 'success' | 'error';
  } | null;
  nodeSummaryData: NodeSummary | null;
  nodeSummaryError: string | null;
  isNodeSummaryLoading: boolean;
  onCloseNodeSummary: () => void;
  onBranchPromptSend: (prompt: string) => Promise<void>;
  preview: { sessionId: string; table: string } | null;
  onClosePreview: () => void;
  onCreateNode: (kind: CreatableNodeKind) => void;
}

export function PlaygroundOverlay({
  isGenerating,
  onPromptSend,
  clarification,
  isSubmittingClarification,
  clarificationError,
  onClarificationSend,
  nodeSummary,
  nodeSummaryData,
  nodeSummaryError,
  isNodeSummaryLoading,
  onCloseNodeSummary,
  onBranchPromptSend,
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

      {/* 하단 중앙 고정: 프롬프트 컴포저 */}
      <div className={`${styles.dock} ${nodeSummary ? styles.dockHidden : ''}`}>
        <PromptComposer
          isGenerating={isGenerating}
          onSend={onPromptSend}
          clarification={clarification}
          isSubmittingClarification={isSubmittingClarification}
          clarificationError={clarificationError}
          onClarificationSend={onClarificationSend}
        />
      </div>
    </div>
  );
}
