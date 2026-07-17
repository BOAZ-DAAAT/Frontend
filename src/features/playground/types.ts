export type PlaygroundNodeKind =
    'datasource'
    | 'sql-agent'
    | 'EDA-agent'
    | 'analysis-agent'
    | 'insight-agent';

export type PlaygroundNodeStatus =
    'idle'
    | 'running'
    | 'success'
    | 'error';

export type PlaygroundNodeData = {
    label: string;
    description: string;
    kind: PlaygroundNodeKind;
    status: PlaygroundNodeStatus;
    eventType?: string;
    lastMessage?: string;
    lastEventAt?: string;
};
