import type { Edge, Node } from '@xyflow/react';

import type { PlaygroundNodeData } from './types';

export const playgroundNodes: Node<PlaygroundNodeData>[] = [
    {
        id: 'datasource',
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
        position: { x: 320, y: 120 },
        data: {
            label: 'SQL Agent',
            description: '질의를 생성하고 데이터를 조회합니다.',
            kind: 'sql-agent',
            status: 'idle',
        },
    },
    {
        id: 'eda-agent',
        position: { x: 640, y: 40 },
        data: {
            label: 'EDA Agent',
            description: '데이터의 구조와 분포를 탐색합니다.',
            kind: 'EDA-agent',
            status: 'idle',
        },
    },
    {
        id: 'analysis-agent',
        position: { x: 960, y: 120 },
        data: {
            label: 'Analysis Agent',
            description: '탐색 결과를 바탕으로 분석을 수행합니다.',
            kind: 'analysis-agent',
            status: 'idle',
        },
    },
];

export const playgroundEdges: Edge[] = [
    {
        id: 'datasource-to-sql',
        source: 'datasource',
        target: 'sql-agent',
        type: 'smoothstep',
        animated: true,
    },
    {
        id: 'sql-to-eda',
        source: 'sql-agent',
        target: 'eda-agent',
        type: 'smoothstep',
        animated: true,
    },
    {
        id: 'eda-to-analysis',
        source: 'eda-agent',
        target: 'analysis-agent',
        type: 'smoothstep',
        animated: true,
    },
];
