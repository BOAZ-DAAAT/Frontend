import { MessageCircleQuestion, Square } from 'lucide-react';
import { useEffect } from 'react';

import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';

import styles from './PromptComposer.module.css';

interface AnalysisReviewOption {
  id: string;
  label: string;
  method: string;
  advantages: string[];
  limitations: string[];
  impact: string;
  recommended: boolean;
}

interface PromptComposerProps {
  isGenerating: boolean;
  canStop?: boolean;
  isStopping?: boolean;
  stopError?: string | null;
  onStop?: () => Promise<void>;
  onSend: (prompt: string) => Promise<void>;
  clarification: {
    eventId: string | null;
    agentName: string;
    question: string;
  } | null;
  analysisReview: {
    eventId: string | null;
    agentName: string;
    approvalId: string;
    question: string;
    proposal: string;
    rationale: string[];
    options: AnalysisReviewOption[];
    recommendedOptionId: string;
    allowFreeText: boolean;
    freeTextPrompt: string;
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
  isSubmittingAnalysisReview: boolean;
  analysisReviewError: string | null;
  onAnalysisReviewDecision: (decision: { selectedOptionId?: string; freeText?: string }) => Promise<void>;
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
  canStop = false,
  isStopping = false,
  stopError = null,
  onStop,
  onSend,
  clarification,
  analysisReview,
  isSubmittingClarification,
  clarificationError,
  onClarificationSend,
  approval,
  isSubmittingApproval,
  approvalError,
  onApprovalDecision,
  isSubmittingAnalysisReview,
  analysisReviewError,
  onAnalysisReviewDecision,
}: PromptComposerProps) {
  const { ref, resize } = useAutoResizeTextarea(5);
  const analysisReviewFreeTextEnabled = Boolean(analysisReview?.allowFreeText);
  const showStopButton = (
    isGenerating
    && !clarification
    && !approval
    && !analysisReview
  );

  useEffect(() => {
    if (ref.current) ref.current.value = '';
    resize();
  }, [analysisReview?.eventId, ref, resize]);

  const handleSend = async () => {
    const prompt = ref.current?.value.trim();

    if (!prompt) return;

    if (analysisReview) {
      if (!analysisReviewFreeTextEnabled || isSubmittingAnalysisReview) return;
      try {
        await onAnalysisReviewDecision({ freeText: prompt });
        if (ref.current) ref.current.value = '';
        resize();
      } catch {
        // 부모가 오류를 표시하며, 입력값은 재시도를 위해 유지한다.
      }
      return;
    }

    if (isSubmittingClarification || approval || (isGenerating && !clarification)) return;

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

  const handleApprove = () => {
    if (isSubmittingApproval) return;
    void onApprovalDecision(true);
  };

  const handleReject = () => {
    if (isSubmittingApproval) return;
    void onApprovalDecision(false);
  };

  const handleSelectReviewOption = (optionId: string) => {
    if (isSubmittingAnalysisReview) return;
    void onAnalysisReviewDecision({ selectedOptionId: optionId });
  };

  const handlePrimaryAction = () => {
    if (showStopButton) {
      if (!isStopping) void onStop?.();
      return;
    }
    void handleSend();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void handleSend();
  };

  return (
    <div
      className={`${styles.composer} ${isGenerating ? styles.generating : ''} ${clarification || approval ? styles.composerClarification : ''} ${analysisReview ? styles.composerReview : ''
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

      {approval ? (
        <section className={styles.clarificationPanel} aria-label="에이전트 승인 요청">
          <div className={styles.clarificationMeta}>
            <MessageCircleQuestion aria-hidden />
            <span>{approval.agentName}</span>
          </div>
          <p className={styles.clarificationQuestion}>{approval.reason}</p>

          {approvalError ? (
            <p id="approval-error" className={styles.error} role="alert">
              {approvalError}
            </p>
          ) : null}

          <div className={styles.approvalActions}>
            <button
              type="button"
              className={`${styles.approvalButton} ${styles.approvalButtonApprove}`}
              onClick={handleApprove}
              disabled={isSubmittingApproval}
              aria-busy={isSubmittingApproval}
            >
              승인
            </button>
            <button
              type="button"
              className={`${styles.approvalButton} ${styles.approvalButtonReject}`}
              onClick={handleReject}
              disabled={isSubmittingApproval}
              aria-busy={isSubmittingApproval}
            >
              거부
            </button>
          </div>
        </section>
      ) : null}

      {analysisReview ? (
        <section className={styles.reviewPanel} aria-label="분석 결과 검토">
          <div className={styles.reviewMeta}>
            <span>{analysisReview.agentName}</span>
          </div>
          {analysisReview.proposal ? (
            <p className={styles.reviewProposal}>{analysisReview.proposal}</p>
          ) : null}
          <p className={styles.reviewQuestion}>{analysisReview.question}</p>

          {analysisReviewError ? (
            <p id="analysis-review-error" className={styles.error} role="alert">
              {analysisReviewError}
            </p>
          ) : null}

          <div className={styles.reviewOptionList}>
            {analysisReview.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.reviewOption}
                onClick={() => handleSelectReviewOption(option.id)}
                disabled={isSubmittingAnalysisReview}
                aria-busy={isSubmittingAnalysisReview}
              >
                <div className={styles.reviewOptionHeader}>
                  <span>{option.label}</span>
                  {option.recommended ? (
                    <span className={styles.reviewOptionBadge}>추천</span>
                  ) : null}
                </div>
                {option.method ? (
                  <p className={styles.reviewOptionMeta}>{option.method}</p>
                ) : null}
                {option.impact ? (
                  <p className={styles.reviewOptionMeta}>{option.impact}</p>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.content}>
        <textarea
          ref={ref}
          onInput={resize}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={analysisReview
            ? analysisReviewFreeTextEnabled
              ? analysisReview.freeTextPrompt
              : '위 옵션 중 하나를 선택해 주세요'
            : isSubmittingClarification
            ? '답변을 전송하고 있습니다'
            : approval
              ? '위 승인/거부 버튼으로 응답해 주세요'
              : clarification
                ? '답변을 입력해 주세요'
                : '프롬프트를 입력해 주세요'}
          className={`${styles.textarea} ${styles.input}`}
          disabled={
            isSubmittingClarification
            || Boolean(approval)
            || (Boolean(analysisReview) && (!analysisReviewFreeTextEnabled || isSubmittingAnalysisReview))
          }
          aria-describedby={
            clarificationError
              ? 'clarification-error'
              : stopError
                ? 'stop-error'
                : undefined
          }
        />

        {clarificationError ? (
          <p id="clarification-error" className={styles.error} role="alert">
            {clarificationError}
          </p>
        ) : null}

        {stopError ? (
          <p id="stop-error" className={styles.error} role="alert">
            {stopError}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button type="button" aria-label="추가" className={styles.iconButton} disabled={Boolean(approval) || Boolean(analysisReview)}>
            <PlusIcon />
          </button>

          <button
            type="button"
            aria-label={showStopButton ? '실행 정지' : clarification ? '답변 전송' : '전송'}
            title={showStopButton ? '실행 정지' : undefined}
            className={`${styles.iconButton} ${styles.sendButton}`}
            onClick={handlePrimaryAction}
            disabled={
              showStopButton
                ? isStopping || !canStop
                : isSubmittingClarification
                  || Boolean(approval)
                  || (Boolean(analysisReview) && (!analysisReviewFreeTextEnabled || isSubmittingAnalysisReview))
                  || (isGenerating && !clarification && !analysisReview)
            }
            aria-busy={isSubmittingClarification || isStopping || isSubmittingAnalysisReview}
          >
            {showStopButton
              ? <Square size={10} fill="currentColor" strokeWidth={0} aria-hidden />
              : <SendIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
