import adjustedEffectChart from './assets/demo/adjusted-review-effect.png';
import delayScoreChart from './assets/demo/delay-score-by-bin.png';
import interventionChart from './assets/demo/intervention-scenarios.png';
import sellerRiskChart from './assets/demo/seller-risk-quadrant.png';
import type { Report, RichReportDocument } from './reportData';

const sharedMethodology =
  '리뷰가 연결된 배송 완료 주문 15,800건을 주문 단위로 분석했다. 배송 예정일 대비 실제 도착일로 지연 일수를 계산하고, 판매자 고정효과와 카테고리·지역·가격·주문 월을 통제했다. 신뢰구간은 판매자 단위 군집 강건 표준오차로 산출했다.';

const fullReport: RichReportDocument = {
  eyebrow: 'OPERATIONS ANALYTICS · DECISION REPORT 01',
  subtitle: '배송 지연이 고객 경험을 훼손하는 임계점을 찾고, 판매자별 개입 순서를 정량화한 운영 의사결정 보고서',
  period: '2025.01—2026.06',
  sampleLabel: '배송 완료·리뷰 연결 주문 15,800건',
  status: '분석 완료 · 내부 의사결정용',
  metrics: [
    { label: '3일+ 지연 비율', value: '21.9%', detail: '3,460 / 15,800건', tone: 'risk' },
    { label: '조정 평점 효과', value: '−0.47점', detail: '3–5일 지연 · 95% CI −0.53~−0.41', tone: 'risk' },
    { label: '핵심 개입 판매자', value: '5곳', detail: '고물량·고지연 동시 충족' },
    { label: '결합 정책 효과', value: '326건', detail: '주문 1만 건당 저평점 방지 추정', tone: 'positive' },
  ],
  executiveSummary: [
    '배송 지연과 리뷰 평점의 관계는 단순 상관을 넘어 뚜렷한 용량–반응 패턴을 보였다. 정시 배송 주문의 평균 평점은 4.42점이지만, 3–5일 지연 시 3.83점, 10일 이상 지연 시 3.08점으로 하락했다.',
    '판매자·카테고리·지역·가격·시즌을 통제한 뒤에도 3–5일 지연은 정시 배송 대비 평점을 0.47점 낮췄다. 따라서 운영 관리 기준을 평균 배송일이 아니라 “3일 이상 지연 비율”로 전환할 근거가 충분하다.',
    '리스크는 전체 판매자에 균등하지 않았다. 주문량과 3일 이상 지연률이 모두 높은 5개 판매자를 우선 관리하면 제한된 운영 자원으로 가장 큰 고객 경험 개선을 기대할 수 있다.',
  ],
  methodology: sharedMethodology,
  dataProfile: [
    '분석 단위는 리뷰가 연결된 배송 완료 주문이며 최종 표본은 15,800건입니다.',
    '정시·조기 배송 8,420건, 1–2일 지연 3,920건, 3–5일 지연 2,140건, 6–9일 지연 910건, 10일 이상 지연 410건으로 구성됩니다.',
    '핵심 결과변수는 1–5점 리뷰 평점이며 주요 설명변수는 예정일 대비 실제 도착일로 계산한 배송 지연 일수입니다.',
  ],
  qualityIssues: [
    '주문별 리뷰 중복은 order_id 기준 대표 review_id 하나만 남겨 과대 집계를 방지했습니다.',
    '배송 완료일·예정일·리뷰 평점이 누락된 주문은 지연 일수나 결과변수를 계산할 수 없어 분석 대상에서 제외했습니다.',
    '가격 상위 5% 제외와 성수기 제외 표본에서도 핵심 효과의 방향과 크기가 유지되는지 별도로 확인했습니다.',
  ],
  hypotheses: [
    '배송이 3일 이상 지연되면 정시 배송 대비 1–2점 리뷰 발생 가능성이 유의하게 높아질 것입니다.',
    '주문량과 3일 이상 지연률이 모두 높은 판매자에 개입할수록 동일한 운영 자원으로 더 많은 저평점을 방지할 수 있을 것입니다.',
    '사전 지연 알림과 판매자 SLA 코칭을 결합하면 단일 정책보다 저평점 방지 효과가 클 것입니다.',
  ],
  conclusion: '배송 지연은 고객 평점과 일관된 음의 관계를 보였고, 그 하락은 3일 지연부터 운영상 의미 있게 커졌습니다. 따라서 3일 이상 지연률을 핵심 SLA로 관리하고 고물량·고지연 판매자부터 단계적으로 개입하는 것이 가장 근거 있는 다음 행동입니다.',
  sections: [
    {
      id: 'finding-01',
      kicker: 'FINDING 01 · DESCRIPTIVE EVIDENCE',
      title: '평점 하락은 3일 지연부터 가속된다',
      lede: '지연 기간이 길어질수록 평균 평점이 일관되게 낮아지는 단조 패턴이 확인됐다.',
      chart: {
        src: delayScoreChart,
        alt: '배송 지연 구간별 평균 리뷰 평점과 주문 수',
        caption: '3–5일 지연 구간의 평균 평점은 3.83점으로 정시 배송보다 0.59점 낮다. 각 구간의 95% 신뢰구간이 좁아 표본 변동만으로 설명되기 어렵다.',
        source: 'Source: demo_orders + demo_reviews · n=15,800 · 미조정 평균',
      },
      callout: {
        label: '운영 임계점',
        value: '3일',
        body: '3일 이상부터 평점 하락 폭과 저평점 발생률이 동시에 커진다. SLA 경보의 1차 기준으로 사용한다.',
        tone: 'risk',
      },
    },
    {
      id: 'finding-02',
      kicker: 'FINDING 02 · ADJUSTED MODEL',
      title: '구성 차이를 통제해도 지연 효과는 유지된다',
      lede: '저평점 상품이나 특정 지역이 지연 주문에 더 많이 섞였을 가능성을 통제한 결과다.',
      chart: {
        src: adjustedEffectChart,
        alt: '공변량 조정 후 지연 구간별 리뷰 평점 효과와 신뢰구간',
        caption: '모든 지연 구간의 95% 신뢰구간이 0을 포함하지 않는다. 10일 이상 지연은 정시 배송 대비 평균 1.09점의 평점 손실과 연결된다.',
        source: 'OLS + seller fixed effects · clustered SE by seller · R²=0.31',
      },
      table: {
        columns: ['검증', '설정', '3–5일 효과', '판정'],
        rows: [
          ['기본 모형', '전체 표본', '−0.47', '유지'],
          ['고가 주문 제외', '상위 가격 5% 제외', '−0.45', '유지'],
          ['성수기 제외', '11–12월 제외', '−0.49', '유지'],
          ['판매자 균형 표본', '주문 100건+ 판매자', '−0.46', '유지'],
        ],
        caption: '주요 표본 정의를 바꿔도 추정치 방향과 크기가 안정적이다.',
      },
    },
    {
      id: 'finding-03',
      kicker: 'FINDING 03 · PRIORITIZATION',
      title: '문제의 크기보다 “영향 가능한 주문 수”로 우선순위를 정한다',
      lede: '지연률만 높은 소형 판매자보다 주문량과 지연률이 동시에 높은 판매자가 총 고객 손실에 더 크게 기여한다.',
      chart: {
        src: sellerRiskChart,
        alt: '판매자별 주문 수와 3일 이상 지연 비율 사분면',
        caption: '우측 상단 5개 판매자는 분석 주문량이 중앙값 이상이면서 3일 이상 지연률이 30%를 넘는다. 색이 붉을수록 지연 주문의 평점 손실도 크다.',
        source: 'Seller-level aggregation · 최소 분석 주문 300건',
      },
      table: {
        columns: ['우선순위', '판매자', '3일+ 지연률', '평점 손실', '권고'],
        rows: [
          ['P0', 'S-014', '34%', '−0.48', '우선출고 룰'],
          ['P0', 'S-021', '29%', '−0.42', 'SLA 코칭'],
          ['P0', 'S-041', '41%', '−0.55', '용량 제한'],
          ['P1', 'S-118', '24%', '−0.34', '지역별 모니터링'],
          ['P1', 'S-186', '33%', '−0.46', '재고 동기화'],
        ],
        caption: '우선순위는 규모, 지연률, 평점 손실을 함께 반영한 관리용 분류다.',
      },
    },
    {
      id: 'finding-04',
      kicker: 'FINDING 04 · POLICY SIMULATION',
      title: '알림은 저비용 방어, SLA 코칭은 효율, 결합 정책은 최대 효과',
      lede: '관찰 데이터에서 추정한 위험도와 보수적 정책 반응률을 결합해 1만 주문당 저평점 방지 건수를 시뮬레이션했다.',
      chart: {
        src: interventionChart,
        alt: '배송 개입 정책별 저평점 방지 건수와 비용',
        caption: '결합 정책의 기대 효과가 가장 크지만 비용도 높다. 단위 비용 대비 효과는 판매자 SLA 코칭이 가장 우수해 첫 실험 후보로 적합하다.',
        source: 'Scenario model · 1–2점 리뷰 방지/10k orders · 1,000 bootstrap intervals',
      },
      callout: {
        label: '권고 실험',
        value: '4주',
        body: 'S-014·S-021·S-041을 대상으로 SLA 코칭 + 사전 알림을 단계적으로 적용하고 저평점률과 지연률을 공동 평가한다.',
        tone: 'positive',
      },
    },
  ],
  recommendations: [
    {
      priority: '01',
      title: '3일 지연 경보를 운영 KPI로 채택',
      body: '평균 배송일 대신 3일 이상 지연률을 판매자·지역·카테고리 단위로 주간 추적한다.',
      owner: 'Fulfillment Ops',
      measure: '3일+ 지연률, 1–2점 리뷰율',
    },
    {
      priority: '02',
      title: 'P0 판매자 3곳에 4주 파일럿',
      body: '사전 알림을 공통 적용하고, SLA 코칭을 순차 도입해 증분 효과를 분리한다.',
      owner: 'Seller Success',
      measure: 'Difference-in-differences',
    },
    {
      priority: '03',
      title: '원인 코드 수집률을 90%까지 상향',
      body: '재고 부족, 집하 지연, 허브 병목을 분리해야 다음 단계의 인과적 처방이 가능하다.',
      owner: 'Data Platform',
      measure: '지연 원인 코드 완결률',
    },
  ],
  limitations: [
    '리뷰를 작성한 주문만 포함하므로 비응답 선택 편향이 남아 있다.',
    '조정 모형은 관찰 가능한 구성 차이는 줄이지만 인과효과를 완전히 보장하지 않는다.',
    '정책 시나리오는 실험 결과가 아니라 보수적 반응률 가정에 기반한 의사결정 보조치다.',
  ],
  footerNote: '본 문서는 테스트 페이지용 합성 데이터로 구성된 분석 예시이며 실제 고객·판매자 정보를 포함하지 않습니다.',
};

function previewDocument(
  eyebrow: string,
  subtitle: string,
  metrics: RichReportDocument['metrics'],
  summary: string[],
  section: RichReportDocument['sections'][number],
): RichReportDocument {
  return {
    eyebrow,
    subtitle,
    period: '2025.01—2026.06',
    sampleLabel: '배송 완료·리뷰 연결 주문 15,800건',
    status: '분석 완료 · Preview',
    metrics,
    executiveSummary: summary,
    methodology: sharedMethodology,
    dataProfile: [
      '분석 단위는 리뷰가 연결된 배송 완료 주문이며 최종 표본은 15,800건입니다.',
      '분석 기간은 2025년 1월부터 2026년 6월이며 판매자·카테고리·지역·가격·주문 월 정보를 함께 사용했습니다.',
    ],
    qualityIssues: [
      '주문별 리뷰 중복을 제거하고 배송일 또는 리뷰 평점이 누락된 행은 분석 대상에서 제외했습니다.',
    ],
    hypotheses: [
      `${section.title}에서 확인한 패턴은 후속 실험 또는 기간 외 검증 표본에서도 유지될 것입니다.`,
    ],
    conclusion: summary.at(-1),
    sections: [section],
    footerNote: '테스트용 합성 데이터 기반 미리보기 보고서입니다.',
  };
}

export const demoReports: Report[] = [
  {
    id: 'demo-delay-impact',
    title: '배송 지연이 리뷰 평점에 미치는 영향',
    author: 'Decision Science',
    date: '2026.07.24',
    markdown: '',
    document: fullReport,
  },
  {
    id: 'demo-seller-sla',
    title: '판매자 SLA 리스크 포트폴리오',
    author: 'Operations Analytics',
    date: '2026.07.24',
    markdown: '',
    document: previewDocument(
      'SELLER OPERATIONS · RISK PORTFOLIO 02',
      '주문 규모와 고객 경험 손실을 함께 고려한 판매자 개입 우선순위',
      [
        { label: '관리 대상', value: '18곳', detail: '분석 주문 300건 이상' },
        { label: 'P0 판매자', value: '3곳', detail: '고물량·고지연', tone: 'risk' },
        { label: '집중 주문 비중', value: '27.4%', detail: 'P0 판매자 주문 비중' },
        { label: '예상 회복 평점', value: '+0.31점', detail: '지연률 10%p 개선 시', tone: 'positive' },
      ],
      [
        '판매자별 지연률만 보면 소형 판매자가 상위에 오르지만, 주문량과 평점 손실을 함께 반영하면 관리 순위가 달라진다.',
        'S-014, S-021, S-041은 운영 개입의 도달 범위와 개선 여지가 모두 크다.',
      ],
      {
        id: 'seller-map',
        kicker: 'PORTFOLIO MAP',
        title: '고객 영향이 큰 우측 상단부터 개입한다',
        chart: {
          src: sellerRiskChart,
          alt: '판매자 SLA 리스크 사분면',
          caption: '점 크기는 주문량, 색상은 지연 주문의 평균 평점 손실이다.',
          source: 'Seller-level aggregation · n=18 sellers',
        },
      },
    ),
  },
  {
    id: 'demo-review-warning',
    title: '리뷰 평점 하락 조기경보',
    author: 'Customer Intelligence',
    date: '2026.07.23',
    markdown: '',
    document: previewDocument(
      'CUSTOMER SIGNAL · EARLY WARNING 03',
      '배송 이벤트만으로 저평점 위험을 조기에 포착하는 모니터링 설계',
      [
        { label: '경보 기준', value: 'D+3', detail: '예정일 이후 3일', tone: 'risk' },
        { label: '저평점 Lift', value: '2.1×', detail: '3일+ 지연 vs 정시' },
        { label: '탐지 재현율', value: '71%', detail: '상위 위험 20%' },
        { label: '알림 비용', value: '₩1.8M', detail: '주문 1만 건 기준' },
      ],
      [
        '저평점 위험은 3일 지연 시점부터 비선형적으로 증가한다.',
        '경보는 확정 지연만 기다리지 않고 D+2 저녁부터 고객 알림과 운영 에스컬레이션을 준비해야 한다.',
      ],
      {
        id: 'warning-curve',
        kicker: 'RISK THRESHOLD',
        title: 'D+3가 고객 경험 손실의 실용적 임계점이다',
        chart: {
          src: delayScoreChart,
          alt: '지연 일수별 평점 변화',
          caption: '정시 4.42점에서 3–5일 지연 3.83점으로 하락한다.',
          source: 'Reviewed orders · n=15,800',
        },
      },
    ),
  },
  {
    id: 'demo-category-sensitivity',
    title: '카테고리별 배송 민감도',
    author: 'Category Analytics',
    date: '2026.07.22',
    markdown: '',
    document: previewDocument(
      'CATEGORY STRATEGY · SENSITIVITY 04',
      '동일한 배송 지연이 카테고리별 고객 평가에 미치는 차이',
      [
        { label: '최고 민감', value: '선물·행사', detail: '3–5일 지연 −0.68점', tone: 'risk' },
        { label: '중앙 효과', value: '−0.47점', detail: '전체 조정 효과' },
        { label: '완충 카테고리', value: '생활소모품', detail: '3–5일 지연 −0.29점' },
        { label: '상호작용 p', value: '0.008', detail: '카테고리×지연' },
      ],
      [
        '배송 지연의 효과는 상품군마다 동일하지 않다. 사용 시점이 고정된 상품일수록 평점 손실이 크다.',
        '카테고리별 SLA를 차등 적용하면 같은 운영 비용으로 더 많은 저평점을 방지할 수 있다.',
      ],
      {
        id: 'category-adjusted',
        kicker: 'ADJUSTED EFFECT',
        title: '기본 효과는 통제 이후에도 선명하다',
        chart: {
          src: adjustedEffectChart,
          alt: '공변량 조정 배송 지연 효과',
          caption: '후속 분석은 이 기본 모형에 카테고리 상호작용을 추가했다.',
          source: 'Seller FE model · clustered SE',
        },
      },
    ),
  },
  {
    id: 'demo-regional-bottleneck',
    title: '지역·허브별 배송 병목 진단',
    author: 'Network Analytics',
    date: '2026.07.21',
    markdown: '',
    document: previewDocument(
      'LOGISTICS NETWORK · BOTTLENECK 05',
      '지역 평균이 숨기는 허브 단위 병목과 고객 경험 전이 효과',
      [
        { label: '집중 허브', value: '4곳', detail: '3일+ 지연의 38%' },
        { label: '최대 병목', value: 'H-07', detail: '지연률 36.8%', tone: 'risk' },
        { label: '지역 설명력', value: '12%', detail: '분산 분해 기준' },
        { label: '판매자 설명력', value: '29%', detail: '분산 분해 기준' },
      ],
      [
        '광역 지역보다 허브×판매자 조합이 지연 변동을 더 잘 설명했다.',
        '지역 전체를 제재하기보다 병목 허브에 연결된 고물량 판매자를 선별하는 편이 효과적이다.',
      ],
      {
        id: 'network-risk',
        kicker: 'NETWORK PRIORITY',
        title: '규모와 평점 손실이 겹치는 조합을 먼저 본다',
        chart: {
          src: sellerRiskChart,
          alt: '운영 병목 우선순위 사분면',
          caption: '상위 위험군은 지연률과 노출 주문 수가 동시에 크다.',
          source: 'Operational risk aggregation',
        },
      },
    ),
  },
  {
    id: 'demo-policy-scenario',
    title: '배송 정책 개입 시나리오',
    author: 'Decision Science',
    date: '2026.07.20',
    markdown: '',
    document: previewDocument(
      'POLICY LAB · SCENARIO 06',
      '저평점 방지 효과와 실행 비용을 함께 비교한 정책 포트폴리오',
      [
        { label: '비용 효율 1위', value: 'SLA 코칭', detail: '₩0.33M / 방지 10건', tone: 'positive' },
        { label: '최대 효과', value: '326건', detail: '결합 정책 · 1만 주문' },
        { label: '저비용 방어', value: '112건', detail: '사전 지연 알림' },
        { label: '권고 파일럿', value: '4주', detail: 'P0 판매자 3곳' },
      ],
      [
        '결합 정책은 총 효과가 가장 크지만, 첫 실험은 비용 효율이 높은 SLA 코칭과 저비용 알림 조합이 적합하다.',
        '정책 성과는 배송 지연률과 저평점률을 함께 보며, 판매자별 사전 추세를 통제해 평가해야 한다.',
      ],
      {
        id: 'policy-chart',
        kicker: 'SCENARIO COMPARISON',
        title: '효과 최대화와 비용 효율은 다른 선택이다',
        chart: {
          src: interventionChart,
          alt: '배송 정책별 저평점 방지 시나리오',
          caption: '막대는 주문 1만 건당 방지되는 1–2점 리뷰, 점은 운영 비용이다.',
          source: 'Bootstrap scenario simulation · 1,000 draws',
        },
      },
    ),
  },
];
