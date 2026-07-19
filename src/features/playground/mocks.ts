import type { Edge, Node } from '@xyflow/react';

import type { PlaygroundNodeData } from './types';

export const playgroundNodes: Node<PlaygroundNodeData>[] = [
  {
    id: 'datasource',
    type: 'playground',
    position: { x: 0, y: 120 },
    data: {
      label: 'Data Source',
      description: '분석에 사용할 원본 데이터를 연결했습니다. 컬럼 구조와 데이터 형식을 확인하고 분석 가능한 상태로 준비합니다.',
      kind: 'datasource',
      status: 'idle',
    },
  },
  {
    id: 'sql-agent',
    type: 'playground',
    position: { x: 460, y: 120 },
    data: {
      label: 'SQL Agent',
      description: '요청한 분석 조건에 맞춰 SQL 질의를 생성했습니다. 필요한 컬럼과 기간을 기준으로 데이터를 조회합니다.',
      kind: 'sql-agent',
      status: 'idle',
    },
  },
  {
    id: 'eda-agent',
    type: 'playground',
    position: { x: 920, y: 40 },
    data: {
      label: 'EDA Agent',
      description: '데이터의 구조와 주요 분포를 탐색했습니다. 결측치와 이상값을 확인하고 분석에 필요한 특징을 정리합니다.',
      kind: 'EDA-agent',
      status: 'idle',
    },
  },
  {
    id: 'analysis-agent',
    type: 'playground',
    position: { x: 1380, y: 120 },
    data: {
      label: 'Analysis Agent',
      description: '탐색 결과를 바탕으로 핵심 지표를 분석했습니다. 변수 사이의 관계와 의미 있는 변화 구간을 확인합니다.',
      kind: 'analysis-agent',
      status: 'idle',
    },
  },
  {
    id: 'insight-agent',
    type: 'playground',
    position: { x: 1840, y: 120 },
    data: {
      label: 'Insight Agent',
      description: '분석 결과를 바탕으로 핵심 인사이트를 정리했습니다. 주요 발견과 다음 단계에서 확인할 내용을 함께 제안합니다.',
      kind: 'insight-agent',
      status: 'idle',
    },
  },
];

export const playgroundEdges: Edge[] = [
  {
    id: 'datasource-to-sql',
    source: 'datasource',
    target: 'sql-agent',
    type: 'playground',
    animated: false,
    data: { flowState: 'active' },
  },
  {
    id: 'sql-to-eda',
    source: 'sql-agent',
    target: 'eda-agent',
    type: 'playground',
    animated: false,
  },
  {
    id: 'eda-to-analysis',
    source: 'eda-agent',
    target: 'analysis-agent',
    type: 'playground',
    animated: false,
  },
  {
    id: 'analysis-to-insight',
    source: 'analysis-agent',
    target: 'insight-agent',
    type: 'playground',
    animated: false,
  },
];
