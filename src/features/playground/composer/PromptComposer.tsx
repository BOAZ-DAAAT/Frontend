import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';

import styles from './PromptComposer.module.css';

interface PromptComposerProps {
  isGenerating: boolean;
  onSend: (prompt: string) => Promise<void>;
}

// TODO: 실제 SVG로 교체 예정.
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// TODO: 실제 SVG로 교체 예정.
function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 16V5M5 10l5-5 5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PromptComposer({
  isGenerating,
  onSend,
}: PromptComposerProps) {
  const { ref, resize } = useAutoResizeTextarea(5);
  const handleSend = () => {
    const prompt = ref.current?.value.trim();

    if (!prompt || isGenerating) return;

    void onSend(prompt);
  };


  return (
    <div
      className={`${styles.composer} ${isGenerating ? styles.generating : ''
        }`}
    >
      {/* 입력 영역 */}
      <textarea ref={ref} onInput={resize} rows={1} placeholder="프롬프트를 입력해 주세요" className={`${styles.textarea} ${styles.input}`} />

      {/* 하단 액션 줄 */}
      <div className={styles.actions}>
        {/* 좌측: + 버튼 */}
        <button type="button" aria-label="추가" className={styles.iconButton}>
          <PlusIcon />
        </button>

        {/* 우측: 전송 버튼 (원형) */}
        <button
          type="button"
          aria-label="전송"
          className={`${styles.iconButton} ${styles.sendButton}`}
          onClick={handleSend}
          disabled={isGenerating}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
