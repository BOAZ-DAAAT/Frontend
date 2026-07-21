import { MessageCircleQuestion } from 'lucide-react';

import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';

import styles from './PromptComposer.module.css';

interface PromptComposerProps {
  isGenerating: boolean;
  onSend: (prompt: string) => Promise<void>;
  clarification: {
    eventId: string | null;
    agentName: string;
    question: string;
  } | null;
  isSubmittingClarification: boolean;
  clarificationError: string | null;
  onClarificationSend: (answer: string) => Promise<void>;
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
  clarification,
  isSubmittingClarification,
  clarificationError,
  onClarificationSend,
}: PromptComposerProps) {
  const { ref, resize } = useAutoResizeTextarea(5);
  const handleSend = async () => {
    const prompt = ref.current?.value.trim();

    if (!prompt || isSubmittingClarification || (isGenerating && !clarification)) return;

    try {
      if (clarification) {
        await onClarificationSend(prompt);
      } else {
        await onSend(prompt);
      }
      if (ref.current) ref.current.value = '';
      resize();
    } catch {
      // 부모가 오류를 표시하며, 입력값은 재시도를 위해 유지한다.
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void handleSend();
  };

  return (
    <div
      className={`${styles.composer} ${isGenerating ? styles.generating : ''} ${clarification ? styles.composerClarification : ''
        }`}
    >
      {clarification ? (
        <section className={styles.clarificationPanel} aria-label="에이전트 추가 질문">
          <div className={styles.clarificationMeta}>
            <MessageCircleQuestion aria-hidden />
            <span>{clarification.agentName}</span>
          </div>
          <p className={styles.clarificationQuestion}>{clarification.question}</p>
        </section>
      ) : null}

      <div className={styles.content}>
        <textarea
          ref={ref}
          onInput={resize}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={isSubmittingClarification
            ? '답변을 전송하고 있습니다'
            : clarification
              ? '답변을 입력해 주세요'
              : '프롬프트를 입력해 주세요'}
          className={`${styles.textarea} ${styles.input}`}
          disabled={isSubmittingClarification}
          aria-describedby={clarificationError ? 'clarification-error' : undefined}
        />

        {clarificationError ? (
          <p id="clarification-error" className={styles.error} role="alert">
            {clarificationError}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button type="button" aria-label="추가" className={styles.iconButton}>
            <PlusIcon />
          </button>

          <button
            type="button"
            aria-label={clarification ? '답변 전송' : '전송'}
            className={`${styles.iconButton} ${styles.sendButton}`}
            onClick={() => void handleSend()}
            disabled={isSubmittingClarification || (isGenerating && !clarification)}
            aria-busy={isSubmittingClarification}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
