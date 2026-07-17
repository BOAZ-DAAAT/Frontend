import type { Edge, Node } from '@xyflow/react';

import type { PlaygroundNodeData } from './types';

export const playgroundNodes: Node<PlaygroundNodeData>[] = [
  {
    id: 'datasource',
    type: 'playground',
    position: { x: 0, y: 120 },
    data: {
      label: 'Data Source',
      description: '분석에 사용할 데이터를 연결합니다.',
      kind: 'datasource',
      status: 'idle',
    },
  },
  {
    id: 'sql-agent',
    type: 'playground',
    position: { x: 360, y: 120 },
    data: {
      label: 'SQL Agent',
      description: '질의를 생성하고 데이터를 조회합니다.',
      kind: 'sql-agent',
      status: 'idle',
    },
  },
  {
    id: 'eda-agent',
    type: 'playground',
    position: { x: 720, y: 40 },
    data: {
      label: 'EDA Agent',
      description: '데이터의 구조와 분포를 탐색합니다.',
      kind: 'EDA-agent',
      status: 'idle',
    },
  },
  {
    id: 'analysis-agent',
    type: 'playground',
    position: { x: 1080, y: 120 },
    data: {
      label: 'Analysis Agent',
      description: '탐색 결과를 바탕으로 분석을 수행합니다.',
      kind: 'analysis-agent',
      status: 'idle',
    },
  },
  {
    id: 'insight-agent',
    type: 'playground',
    position: { x: 1440, y: 120 },
    data: {
      label: 'Insight Agent',
      description: '분석 결과를 바탕으로 핵심 인사이트를 정리합니다.',
      kind: 'insight-agent',
      status: 'idle',
    },
  },
];

// 정적(애니메이션 없음) 회색 점선 엣지
const edgeStyle = { stroke: '#c2c2c2', strokeWidth: 1.5, strokeDasharray: '6 6' };

export const playgroundEdges: Edge[] = [
  {
    id: 'datasource-to-sql',
    source: 'datasource',
    target: 'sql-agent',
    type: 'default',
    animated: false,
    style: edgeStyle,
  },
  {
    id: 'sql-to-eda',
    source: 'sql-agent',
    target: 'eda-agent',
    type: 'default',
    animated: false,
    style: edgeStyle,
  },
  {
    id: 'eda-to-analysis',
    source: 'eda-agent',
    target: 'analysis-agent',
    type: 'default',
    animated: false,
    style: edgeStyle,
  },
  {
    id: 'analysis-to-insight',
    source: 'analysis-agent',
    target: 'insight-agent',
    type: 'default',
    animated: false,
    style: edgeStyle,
  },
];
