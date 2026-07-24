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
    | 'error';

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
    onDeleteRun?: (runId: string, label: string) => void;
};
