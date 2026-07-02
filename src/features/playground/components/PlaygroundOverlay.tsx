import { PromptComposer } from '@/features/playground/components/PromptComposer';

import styles from './PlaygroundOverlay.module.css';

export function PlaygroundOverlay() {
  return (
    // 캔버스 전체를 덮되, 클릭은 통과시키고(overlay: pointer-events none)
    // 실제 UI 요소(dock)에서만 클릭을 받는다(pointer-events auto)
    <div className={styles.overlay}>
      {/* 하단 중앙 고정 */}
      <div className={styles.dock}>
        <PromptComposer />
      </div>
    </div>
  );
}
