export type PlaygroundNodeKind =
    'datasource'
    | 'sql-agent'
    | 'EDA-agent'
    | 'analysis-agent';

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
};