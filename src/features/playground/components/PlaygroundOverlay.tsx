import { AccountStack } from '@/features/playground/account/AccountStack';
import { PromptComposer } from '@/features/playground/composer/PromptComposer';
import { ReportWorkspace } from '@/features/playground/report/ReportWorkspace';
import { Sidebar } from '@/features/playground/sidebar/Sidebar';
import { useSidebar } from '@/features/playground/sidebar/SidebarContext';
import { TablePreviewPanel } from '@/features/playground/table-preview/TablePreviewPanel';
import { Toolbar } from '@/features/playground/toolbar/Toolbar';

import styles from './PlaygroundOverlay.module.css';

interface PlaygroundOverlayProps {
  isGenerating: boolean;
  onPromptSend: (prompt: string) => Promise<void>;
  preview: { sessionId: string; table: string } | null;
  onClosePreview: () => void;
}

export function PlaygroundOverlay({
  isGenerating,
  onPromptSend,
  preview,
  onClosePreview,
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

      {isReportWorkspaceOpen && <ReportWorkspace />}

      {preview && (
        <TablePreviewPanel
          sessionId={preview.sessionId}
          table={preview.table}
          onClose={onClosePreview}
        />
      )}

      {/* 좌상단 고정: 사이드바 */}
      <div className={styles.sidebarDock}>
        <Sidebar />
      </div>

      {/* 하단 중앙 고정: 프롬프트 컴포저 */}
      <div className={styles.dock}>
        <PromptComposer
          isGenerating={isGenerating}
          onSend={onPromptSend}
        />
      </div>
    </div>
  );
}
