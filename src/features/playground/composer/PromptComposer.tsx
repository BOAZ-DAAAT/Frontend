import { Check, MessageCircleQuestion, Square } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';
import { BlobOrb } from '@/pages/BlobPage';

import styles from './PromptComposer.module.css';

interface PromptComposerProps {
  isGenerating: boolean;
  canStop?: boolean;
  isStopping?: boolean;
  stopError?: string | null;
  onStop?: () => Promise<void>;
  onSend: (prompt: string) => Promise<void>;
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
}: PromptComposerProps) {
  const { ref, resize } = useAutoResizeTextarea(5);
  const [selectedReviewOptionId, setSelectedReviewOptionId] = useState<string | null>(null);
  const showStopButton = (
    isGenerating
    && !clarification
    && !approval
    && !analysisReview
  );

  useEffect(() => {
    setSelectedReviewOptionId(null);
  }, [analysisReview?.requestKey]);

  const handleSend = async () => {
    const prompt = ref.current?.value.trim();

    if (
      !prompt
      || isSubmittingClarification
      || isSubmittingAnalysisReview
      || approval
      || (analysisReview && !analysisReview.allowFreeText)
      || (isGenerating && !clarification && !analysisReview)
    ) return;

    try {
      if (clarification) {
        await onClarificationSend(prompt);
      } else if (analysisReview) {
        await onAnalysisReviewDecision({ freeText: prompt });
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

  const handleReviewOption = async (optionId: string) => {
    if (isSubmittingAnalysisReview) return;
    setSelectedReviewOptionId(optionId);
    try {
      await onAnalysisReviewDecision({ selectedOptionId: optionId });
    } catch {
      setSelectedReviewOptionId(null);
    }
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
    <div className={`${styles.composerShell} ${isGenerating ? styles.composerShellActive : ''}`}>
      <div
        className={`${styles.composer} ${isGenerating ? styles.composerActive : ''} ${clarification || approval ? styles.composerClarification : ''} ${analysisReview ? styles.composerReview : ''
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
          <p className={styles.reviewContent}>{analysisReview.content}</p>
          {analysisReviewError ? (
            <p id="analysis-review-error" className={styles.error} role="alert">
              {analysisReviewError}
            </p>
          ) : null}
          <div className={styles.reviewActions}>
            {analysisReview.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.reviewButton} ${styles.reviewConfirm} ${selectedReviewOptionId === option.id ? styles.reviewButtonSelected : ''}`}
                onClick={() => void handleReviewOption(option.id)}
                disabled={isSubmittingAnalysisReview}
                aria-busy={isSubmittingAnalysisReview && selectedReviewOptionId === option.id}
                aria-pressed={selectedReviewOptionId === option.id}
              >
                {option.recommended ? <Check aria-hidden /> : null}
                {option.label}
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
            ? analysisReview.allowFreeText
              ? '다른 분석 조건이나 의견을 입력해 주세요'
              : '위 선택지로 응답해 주세요'
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
            || isSubmittingAnalysisReview
            || Boolean(approval)
            || Boolean(analysisReview && !analysisReview.allowFreeText)
          }
          aria-describedby={
            clarificationError
              ? 'clarification-error'
              : analysisReviewError
                ? 'analysis-review-error'
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
            className={`${styles.iconButton} ${styles.sendButton} ${
              showStopButton ? styles.stopButtonActive : ''
            }`}
            onClick={handlePrimaryAction}
            disabled={
              showStopButton
                ? isStopping || !canStop
                : isSubmittingClarification
                  || Boolean(approval)
                  || isSubmittingAnalysisReview
                  || Boolean(analysisReview && !analysisReview.allowFreeText)
                  || (isGenerating && !clarification && !analysisReview)
            }
            aria-busy={isSubmittingClarification || isSubmittingAnalysisReview || isStopping}
          >
            {showStopButton ? (
              <span className={styles.stopButtonVisual} aria-hidden="true">
                <span className={styles.stopButtonBlob}>
                  <BlobOrb active motion={1} speed={0.46} />
                </span>
                <Square
                  className={styles.stopButtonIcon}
                  size={10}
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            ) : (
              <SendIcon />
            )}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
