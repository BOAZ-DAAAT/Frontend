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
  isSubmittingApproval: false,
  approvalError: null,
  onApprovalDecision: noop,
  isSubmittingAnalysisReview: false,
  analysisReviewError: null,
  onAnalysisReviewDecision: noop,
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
              agentName: '분석 에이전트',
              approvalId: 'composer-preview-review',
              question: '어떤 방법으로 분석을 진행할까요?',
              proposal: '배송 지연 여부에 따른 평균 리뷰 점수 차이를 비교하는 방법을 제안합니다.',
              rationale: [
                '그룹 간 평균 차이를 직접 비교할 수 있습니다.',
                '표본 크기가 충분해 통계적으로 안정적입니다.',
              ],
              options: [
                {
                  id: 'welch-t-test',
                  label: 'Welch 독립표본 t 검정',
                  method: '지연/비지연 그룹의 평균 리뷰 점수를 비교합니다.',
                  advantages: ['그룹 분산이 달라도 안정적입니다.'],
                  limitations: ['인과관계를 의미하지 않습니다.'],
                  impact: '두 그룹의 평균 차이와 신뢰구간을 제시합니다.',
                  recommended: true,
                },
              ],
              recommendedOptionId: 'welch-t-test',
              allowFreeText: true,
              freeTextPrompt: '다른 분석 방법을 요청하시겠어요?',
            }}
          />
        </section>
      </div>
    </main>
  );
}
