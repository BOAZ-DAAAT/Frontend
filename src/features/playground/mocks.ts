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
];

export const playgroundEdges: Edge[] = [];
