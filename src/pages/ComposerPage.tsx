import { PromptComposer } from '@/features/playground/composer/PromptComposer';

import styles from './ComposerPage.module.css';

const noop = async () => undefined;

const sharedProps = {
  canStop: true,
  onStop: noop,
  onSend: noop,
  isSubmittingClarification: false,
  clarificationError: null,
  onClarificationSend: noop,
  isSubmittingAnalysisReview: false,
  analysisReviewError: null,
  onAnalysisReviewDecision: noop,
  isSubmittingApproval: false,
  approvalError: null,
  onApprovalDecision: noop,
};

export function ComposerPage() {
  return (
    <main className={styles.page}>
      <div className={styles.gallery}>
        <section className={styles.variant}>
          <h2 className={styles.label}>기본 입력</h2>
          <PromptComposer
            {...sharedProps}
            isGenerating={false}
            clarification={null}
            analysisReview={null}
            approval={null}
          />
        </section>

        <section className={styles.variant}>
          <h2 className={styles.label}>프롬프트 실행 중</h2>
          <PromptComposer
            {...sharedProps}
            isGenerating
            clarification={null}
            analysisReview={null}
            approval={null}
          />
        </section>

        <section className={styles.variant}>
          <h2 className={styles.label}>사용자 추가 질문</h2>
          <PromptComposer
            {...sharedProps}
            isGenerating
            clarification={{
              eventId: 'composer-preview-clarification',
              requestKey: 'composer-preview-clarification',
              agentName: '데이터 분석 에이전트',
              question: '어떤 기간의 데이터를 기준으로 분석할까요?',
            }}
            analysisReview={null}
            approval={null}
          />
        </section>

        <section className={styles.variant}>
          <h2 className={styles.label}>승인 또는 거부 요청</h2>
          <PromptComposer
            {...sharedProps}
            isGenerating
            clarification={null}
            analysisReview={null}
            approval={{
              eventId: 'composer-preview-approval',
              requestKey: 'composer-preview-approval',
              agentName: 'SQL 실행 에이전트',
              reason: '데이터 조회를 위해 쿼리 실행 승인이 필요합니다.',
            }}
          />
        </section>

        <section className={styles.variant}>
          <h2 className={styles.label}>분석 결과 검토</h2>
          <PromptComposer
            {...sharedProps}
            isGenerating
            clarification={null}
            approval={null}
            analysisReview={{
              eventId: 'composer-preview-review',
              requestKey: 'composer-preview-review',
              approvalId: 'composer-preview-review',
              agentName: '분석 에이전트',
              content: '분석 결과가 준비되었습니다.\n내용을 검토한 뒤 확인 또는 거부를 선택해 주세요.',
              options: [
                { id: 'approve', label: '확인', recommended: true },
                { id: 'reject', label: '거부', recommended: false },
              ],
              allowFreeText: true,
            }}
          />
        </section>
      </div>
    </main>
  );
}
