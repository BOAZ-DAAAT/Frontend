import type { Edge, Node } from '@xyflow/react';

import type {
  PlaygroundNodeData,
  PlaygroundNodeKind,
  PlaygroundNodeQuery,
} from './types';

const SELLER_RUN = 'run_751c7affbc4d4d0780aa93c290c8721e';
const COHORT_RUN = 'run_d8c3dce4d2e04889af71986351b9e3bf';
const COHORT_BRANCH_RUN = 'run_65933d377fa1422fa16fb043eecd7a1b';
const VIOLIN_BRANCH_RUN = 'run_fb29b08ffbd84d5dafa13f437228e203';
const DELAY_GROUP_BRANCH_RUN = 'run_6817558934094419bd057acc87618927';
const ORDER_STATUS_RUN = 'run_18253348bc9041beb97d6eaa2c3899c8';

const sellerQuery =
  '주문·상품·리뷰·판매자 데이터를 연결해 seller_id 기준으로 배송 소요일과 리뷰 점수의 관계를 분석해줘.';
const cohortQuery =
  '고객의 첫 구매 월을 기준으로 월별 재구매 코호트 분석을 수행하고, 코호트별 재구매율을 비교 분석한다. 고객 식별은 `customer_unique_id`를 사용하고, 재구매는 서로 다른 주문이 2건 이상인 고객으로 정의하며, 구매 빈도는 고객별 `COUNT(DISTINCT orders.order_id)`로 계산한다. 코호트 기준은 고객의 첫 구매 월(`order_purchase_timestamp`의 월 단위)이며, 결과에는 재구매 기준과 관측 기간을 함께 명시한다.';
const cohortBranchQuery =
  '코호트별 재구매율 차이가 단순 표본 수 차이인지 확인하고 싶어. cohort_month별 고객 수와 재구매 고객 수를 기준으로 카이제곱 검정 수행해줘.';
const violinBranchQuery =
  '배송 소요일 구간에 따른 리뷰 점수의 분포를 바이올린 차트로 보고 싶어 추가적으로 분석 넣어서 진행해줘';
const orderStatusQuery = '주문 상태별로 주문이 어느 단계에서 이탈하거나 지연되는지 분석해줘.';

type NodeSeed = {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
  kind: PlaygroundNodeKind;
  runId?: string;
  sequence: number;
  parentNodeId: string | null;
  agentName: string;
  queryBadges?: PlaygroundNodeQuery[];
  selected?: boolean;
};

function queryBadge(text: string, flowNodeId: string, label = '원본 쿼리'): PlaygroundNodeQuery {
  return { label, text, flowNodeId };
}

const sellerFlowId = `${SELLER_RUN}:node:4`;
const cohortFlowId = `${COHORT_RUN}:node:4`;
const cohortBranchFlowId = `${COHORT_BRANCH_RUN}:branch:2`;
const violinFlowId = `${VIOLIN_BRANCH_RUN}:branch:3`;
const delayGroupFlowId = `${DELAY_GROUP_BRANCH_RUN}:branch:4`;
const orderStatusFlowId = `${ORDER_STATUS_RUN}:node:4`;

const seeds: NodeSeed[] = [
  {
    id: `datasource:${SELLER_RUN}`,
    x: -418,
    y: 1260,
    label: 'Data Source',
    description: '원본 데이터 연결이 완료되었습니다.\nDatabase: olist_sampling',
    kind: 'datasource',
    sequence: 0,
    parentNodeId: null,
    agentName: 'datasource',
  },
  {
    id: `${SELLER_RUN}:node:1`,
    x: 62.21448796570613,
    y: 1260,
    label: 'SQL Agent',
    description: 'seller_id × order_id × order_item_id grain에서 주문상품, 배송일, 리뷰를 결합해 배송 지연과 리뷰를 함께 분석할 수 있는 마트가 구성되었습니다.',
    kind: 'sql-agent',
    runId: SELLER_RUN,
    sequence: 1,
    parentNodeId: `datasource:${SELLER_RUN}`,
    agentName: 'sql_agent',
    queryBadges: [
      queryBadge(sellerQuery, sellerFlowId),
      queryBadge(violinBranchQuery, violinFlowId, '분기 쿼리'),
      queryBadge(sellerQuery, delayGroupFlowId),
    ],
  },
  {
    id: `${SELLER_RUN}:node:2`,
    x: 542.2144879657061,
    y: 1260,
    label: 'EDA Agent',
    description: '배송이 길거나 지연이 큰 경우 리뷰 점수가 낮아지는 약한 관계가 보였지만, seller_id 표본 부족과 배송일 이상치 때문에 후속 검증이 필요합니다.',
    kind: 'EDA-agent',
    runId: SELLER_RUN,
    sequence: 2,
    parentNodeId: `${SELLER_RUN}:node:1`,
    agentName: 'eda_agent',
    queryBadges: [queryBadge(sellerQuery, sellerFlowId)],
  },
  {
    id: `${SELLER_RUN}:node:3`,
    x: 988.5178727887663,
    y: 1260,
    label: 'Analysis Agent',
    description: '리뷰가 있는 11771개 행에서 배송 소요일과 리뷰 점수는 양의 방향으로 연관되었지만, 관계는 약하며 판매자 수준 결과는 인과적으로 해석할 수 없습니다.',
    kind: 'analysis-agent',
    runId: SELLER_RUN,
    sequence: 3,
    parentNodeId: `${SELLER_RUN}:node:2`,
    agentName: 'analysis_agent',
    queryBadges: [queryBadge(sellerQuery, sellerFlowId)],
  },
  {
    id: sellerFlowId,
    x: 1444.192314978385,
    y: 1260.1148199968397,
    label: 'Insight Agent',
    description: '배송 소요일이 길수록 리뷰 점수가 다소 낮아지는 약한 연관이 있으나, 판매자별 표본 불균형 때문에 주문 운영 관점으로 해석해야 합니다.',
    kind: 'insight-agent',
    runId: SELLER_RUN,
    sequence: 4,
    parentNodeId: `${SELLER_RUN}:node:3`,
    agentName: 'insight',
    queryBadges: [queryBadge(sellerQuery, sellerFlowId)],
  },
  {
    id: `datasource:${COHORT_RUN}`,
    x: -420,
    y: 838,
    label: 'Data Source',
    description: '원본 데이터 연결이 완료되었습니다.\nDatabase: olist_sampling',
    kind: 'datasource',
    sequence: 0,
    parentNodeId: null,
    agentName: 'datasource',
  },
  {
    id: `${COHORT_RUN}:node:1`,
    x: 60,
    y: 838,
    label: 'SQL Agent',
    description: 'customers와 orders를 고객 단위로 연결해 주문 수와 첫 구매 월을 산출하고, customer_unique_id × first_purchase_month × observation_month grain으로 월별 재구매 코호트를 분석할 수 있는 마트를 구축하였습니다.',
    kind: 'sql-agent',
    runId: COHORT_RUN,
    sequence: 1,
    parentNodeId: `datasource:${COHORT_RUN}`,
    agentName: 'sql_agent',
    queryBadges: [queryBadge(cohortQuery, cohortFlowId)],
  },
  {
    id: `${COHORT_RUN}:node:2`,
    x: 522,
    y: 838,
    label: 'EDA Agent',
    description: '재구매는 희소하고 주문 빈도는 극단적으로 치우쳐 있으며, 월별 코호트 차이와 관측 기간 제약이 함께 재구매율 해석을 흔들 수 있습니다.',
    kind: 'EDA-agent',
    runId: COHORT_RUN,
    sequence: 2,
    parentNodeId: `${COHORT_RUN}:node:1`,
    agentName: 'eda_agent',
    queryBadges: [
      queryBadge(cohortQuery, cohortFlowId),
      queryBadge(cohortBranchQuery, cohortBranchFlowId, '분기 쿼리'),
    ],
  },
  {
    id: `${COHORT_RUN}:node:3`,
    x: 982,
    y: 838,
    label: 'Analysis Agent',
    description: '첫 구매 월 코호트와 관측 월 기준의 재구매율은 차이 신호를 보였지만, 관측기간 편향 때문에 그 차이를 효과로 단정하기는 어렵습니다. 다만 일부 추세는 통계적으로 확정되지 않았습니다.',
    kind: 'analysis-agent',
    runId: COHORT_RUN,
    sequence: 3,
    parentNodeId: `${COHORT_RUN}:node:2`,
    agentName: 'analysis_agent',
    queryBadges: [queryBadge(cohortQuery, cohortFlowId)],
  },
  {
    id: cohortFlowId,
    x: 1442,
    y: 838,
    label: 'Insight Agent',
    description: '첫 구매 월 코호트별 재구매율 차이는 존재하나 전반적으로 낮으며, 최근 코호트는 관측 기간 부족을 함께 고려해야 합니다.',
    kind: 'insight-agent',
    runId: COHORT_RUN,
    sequence: 4,
    parentNodeId: `${COHORT_RUN}:node:3`,
    agentName: 'insight',
    queryBadges: [queryBadge(cohortQuery, cohortFlowId)],
  },
  {
    id: `${COHORT_BRANCH_RUN}:branch:1`,
    x: 982,
    y: 602,
    label: 'Analysis Agent',
    description: 'first_purchase_month별 고객 수와 재구매 고객 수로 카이제곱 검정을 재수행한 결과, 단순 표본 수 차이만으로는 설명하기 어려운 연관성이 유지되었고 코호트 간 재구매 분포 차이는 통계적으로 유의했습니다.',
    kind: 'analysis-agent',
    runId: COHORT_BRANCH_RUN,
    sequence: 1,
    parentNodeId: `${COHORT_RUN}:node:2`,
    agentName: 'analysis_agent',
    queryBadges: [queryBadge(cohortBranchQuery, cohortBranchFlowId, '분기 쿼리')],
  },
  {
    id: cohortBranchFlowId,
    x: 1442,
    y: 602,
    label: 'Insight Agent',
    description: 'cohort_month별 고객 수와 재구매 고객 수 기준으로 다시 검정해도 코호트와 재구매의 유의한 관계는 유지되었으며, 단순 표본 수 차이로만 설명되지는 않았습니다.',
    kind: 'insight-agent',
    runId: COHORT_BRANCH_RUN,
    sequence: 2,
    parentNodeId: `${COHORT_BRANCH_RUN}:branch:1`,
    agentName: 'insight',
    queryBadges: [queryBadge(cohortBranchQuery, cohortBranchFlowId, '분기 쿼리')],
  },
  {
    id: `${VIOLIN_BRANCH_RUN}:branch:1`,
    x: 550.2144879657061,
    y: 1542,
    label: 'EDA Agent',
    description: '배송 소요일과 리뷰 점수는 구간별 분포 차이와 함께 중간 수준의 양의 신호가 유지되었으며, 요청된 바이올린 차트 추가로 그 경향을 분포 기준으로도 확인하였습니다.',
    kind: 'EDA-agent',
    runId: VIOLIN_BRANCH_RUN,
    sequence: 1,
    parentNodeId: `${SELLER_RUN}:node:1`,
    agentName: 'eda_agent',
    queryBadges: [queryBadge(violinBranchQuery, violinFlowId, '분기 쿼리')],
  },
  {
    id: `${VIOLIN_BRANCH_RUN}:branch:2`,
    x: 1004.2144879657062,
    y: 1542,
    label: 'Analysis Agent',
    description: '리뷰가 있는 주문 11682건에서 배송 소요일과 리뷰 점수는 약한 양(+)의 단조 관계를 보였고, 추가된 배송 소요일 구간별 바이올린 차트 관점에서도 같은 경향을 분포로 점검할 수 있었습니다. 다만 일부 추세는 통계적으로 확정되지 않았습니다.',
    kind: 'analysis-agent',
    runId: VIOLIN_BRANCH_RUN,
    sequence: 2,
    parentNodeId: `${VIOLIN_BRANCH_RUN}:branch:1`,
    agentName: 'analysis_agent',
    queryBadges: [queryBadge(violinBranchQuery, violinFlowId, '분기 쿼리')],
  },
  {
    id: violinFlowId,
    x: 1464.2144879657062,
    y: 1542,
    label: 'Insight Agent',
    description: '리뷰가 있는 주문 11,682건에서 배송 소요일과 리뷰 점수의 약한 양의 관계가 사분위 구간 바이올린 차트 추가 분석으로도 유지되었습니다.',
    kind: 'insight-agent',
    runId: VIOLIN_BRANCH_RUN,
    sequence: 3,
    parentNodeId: `${VIOLIN_BRANCH_RUN}:branch:2`,
    agentName: 'insight',
    queryBadges: [queryBadge(violinBranchQuery, violinFlowId, '분기 쿼리')],
  },
  {
    id: `${DELAY_GROUP_BRANCH_RUN}:branch:1`,
    x: 546.2144879657061,
    y: 1830,
    label: 'SQL Agent',
    description: '주문-판매자 단위 마트에 delivery_delay_group을 추가해 배송 지연 구간별 리뷰 비교가 가능해졌고, 지시사항 반영 후에도 배송과 리뷰의 관계는 같은 분석 틀 안에서 유지되었습니다.',
    kind: 'sql-agent',
    runId: DELAY_GROUP_BRANCH_RUN,
    sequence: 1,
    parentNodeId: `${SELLER_RUN}:node:1`,
    agentName: 'sql_agent',
    queryBadges: [queryBadge(sellerQuery, delayGroupFlowId)],
  },
  {
    id: `${DELAY_GROUP_BRANCH_RUN}:branch:2`,
    x: 1008.2144879657062,
    y: 1830,
    label: 'EDA Agent',
    description: 'delivery_delay_group 파생을 반영해도 배송 지연이 길수록 리뷰 점수가 낮아지는 경향은 유지되었고, delivered 편중과 seller_id 소표본 구조를 고려한 뒤 검정으로 이어져야 합니다.',
    kind: 'EDA-agent',
    runId: DELAY_GROUP_BRANCH_RUN,
    sequence: 2,
    parentNodeId: `${DELAY_GROUP_BRANCH_RUN}:branch:1`,
    agentName: 'eda_agent',
    queryBadges: [queryBadge(sellerQuery, delayGroupFlowId)],
  },
  {
    id: `${DELAY_GROUP_BRANCH_RUN}:branch:3`,
    x: 1474.2144879657062,
    y: 1830,
    label: 'Analysis Agent',
    description: 'delivery_delay_group을 새로 파생해도 배송 지연이 길수록 리뷰 점수가 낮아지는 경향과 구간별 분포 차이는 유지되었으며, 이는 리뷰가 존재하는 주문에 한정된 통계적 연관입니다.',
    kind: 'analysis-agent',
    runId: DELAY_GROUP_BRANCH_RUN,
    sequence: 3,
    parentNodeId: `${DELAY_GROUP_BRANCH_RUN}:branch:2`,
    agentName: 'analysis_agent',
    queryBadges: [queryBadge(sellerQuery, delayGroupFlowId)],
  },
  {
    id: delayGroupFlowId,
    x: 1934.2144879657062,
    y: 1830,
    label: 'Insight Agent',
    description: 'delivery_delay_group으로 구간화해도 배송 지연이 길수록 리뷰 점수가 낮아지는 경향은 유지되었으며, 지연 구간별 차이는 유의했습니다.',
    kind: 'insight-agent',
    runId: DELAY_GROUP_BRANCH_RUN,
    sequence: 4,
    parentNodeId: `${DELAY_GROUP_BRANCH_RUN}:branch:3`,
    agentName: 'insight',
    queryBadges: [queryBadge(sellerQuery, delayGroupFlowId)],
  },
  {
    id: `datasource:${ORDER_STATUS_RUN}`,
    x: -420,
    y: 2224,
    label: 'Data Source',
    description: '원본 데이터 연결이 완료되었습니다.\nDatabase: olist_sampling',
    kind: 'datasource',
    sequence: 0,
    parentNodeId: null,
    agentName: 'datasource',
  },
  {
    id: `${ORDER_STATUS_RUN}:node:1`,
    x: 60,
    y: 2224,
    label: 'SQL Agent',
    description: 'orders 단일 소스에서 order_id grain을 유지한 상태·배송 마트가 생성되어, 주문 단계와 지연 여부를 함께 분석할 수 있게 되었습니다.',
    kind: 'sql-agent',
    runId: ORDER_STATUS_RUN,
    sequence: 1,
    parentNodeId: `datasource:${ORDER_STATUS_RUN}`,
    agentName: 'sql_agent',
    queryBadges: [queryBadge(orderStatusQuery, orderStatusFlowId)],
  },
  {
    id: `${ORDER_STATUS_RUN}:node:2`,
    x: 520,
    y: 2224,
    label: 'EDA Agent',
    description: '주문 상태와 배송 단계가 완료 중심으로 강하게 집중되어 있어, 지연·결측 해석을 통제한 분류 검정이 필요한 EDA 결과입니다.',
    kind: 'EDA-agent',
    runId: ORDER_STATUS_RUN,
    sequence: 2,
    parentNodeId: `${ORDER_STATUS_RUN}:node:1`,
    agentName: 'eda_agent',
    queryBadges: [queryBadge(orderStatusQuery, orderStatusFlowId)],
  },
  {
    id: `${ORDER_STATUS_RUN}:node:3`,
    x: 980,
    y: 2224,
    label: 'Analysis Agent',
    description: '주문은 완료 상태와 배송 완료 단계에 강하게 집중되었고, 상태-단계는 유의한 기술적 연관성을 보였으며, 미배송은 기준시점과 예상 배송일을 함께 보아 진행 중·지연 후보로 나누어 해석해야 합니다.',
    kind: 'analysis-agent',
    runId: ORDER_STATUS_RUN,
    sequence: 3,
    parentNodeId: `${ORDER_STATUS_RUN}:node:2`,
    agentName: 'analysis_agent',
    queryBadges: [queryBadge(orderStatusQuery, orderStatusFlowId)],
  },
  {
    id: orderStatusFlowId,
    x: 1440,
    y: 2224,
    label: 'Insight Agent',
    description: '주문 흐름은 대부분 완료되지만, 지연과 미배송 판정은 승인 후-출고 전 및 출고 후-배송 전 구간을 중심으로 관리해야 합니다.',
    kind: 'insight-agent',
    runId: ORDER_STATUS_RUN,
    sequence: 4,
    parentNodeId: `${ORDER_STATUS_RUN}:node:3`,
    agentName: 'insight',
    queryBadges: [queryBadge(orderStatusQuery, orderStatusFlowId)],
    selected: true,
  },
];

const activeNodeIds = new Set([
  `datasource:${ORDER_STATUS_RUN}`,
  `${ORDER_STATUS_RUN}:node:1`,
  `${ORDER_STATUS_RUN}:node:2`,
  `${ORDER_STATUS_RUN}:node:3`,
  orderStatusFlowId,
]);

export const mockupNodes: Array<Node<PlaygroundNodeData>> = seeds.map((seed) => ({
  id: seed.id,
  type: 'playground',
  position: { x: seed.x, y: seed.y },
  selected: seed.selected,
  data: {
    label: seed.label,
    description: seed.description,
    kind: seed.kind,
    status: 'success',
    runId: seed.runId,
    nodeSequence: seed.sequence,
    parentNodeId: seed.parentNodeId,
    agentName: seed.agentName,
    queryLabel: seed.queryBadges?.[0]?.label,
    queryText: seed.queryBadges?.[0]?.text,
    queryBadges: seed.queryBadges,
  },
}));

export const mockupEdges: Edge[] = seeds.flatMap((seed) => {
  if (!seed.parentNodeId) return [];
  return [{
    id: `${seed.parentNodeId}-to-${seed.id}`,
    source: seed.parentNodeId,
    target: seed.id,
    type: 'playground',
    selectable: false,
    animated: false,
    zIndex: 0,
    data: {
      flowState: activeNodeIds.has(seed.parentNodeId) && activeNodeIds.has(seed.id)
        ? 'active'
        : 'idle',
    },
  }];
});

export const mockupGraph = {
  nodes: mockupNodes,
  edges: mockupEdges,
};
