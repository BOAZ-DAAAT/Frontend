export type PlaygroundNodeKind =
    'supervisor'
    | 'datasource'
    | 'sql-agent'
    | 'EDA-agent'
    | 'analysis-agent'
    | 'insight-agent';

export type PlaygroundNodeStatus =
    'selecting'
    | 'idle'
    | 'running'
    | 'waiting'
    | 'success'
    | 'cancelled'
    | 'error';

export const ERROR_NODE_DESCRIPTION =
    '분석 작업을 완료하지 못했습니다. 오류 내용을 확인한 뒤 다시 시도해 주세요.';

export type PlaygroundNodeQuery = {
    label: string;
    text: string;
    flowNodeId?: string;
};

export type PlaygroundNodeData = {
    label: string;
    description: string;
    kind: PlaygroundNodeKind;
    status: PlaygroundNodeStatus;
    chart?: {
        label: string;
        values: number[];
    };
    eventType?: string;
    lastMessage?: string;
    lastEventAt?: string;
    runId?: string;
    parentNodeId?: string | null;
    nodeSequence?: number;
    agentName?: string;
    queryLabel?: string;
    queryText?: string;
    queryBadges?: PlaygroundNodeQuery[];
    animateOnCreate?: boolean;
    onFlowHover?: (nodeId: string | null) => void;
    onDeleteRun?: (runId: string, label: string) => void;
};
