import type { Edge, Node } from '@xyflow/react';

import type { RunEvent } from '@/features/runs/types';

import type { PlaygroundNodeData, PlaygroundNodeKind, PlaygroundNodeStatus } from './types';

const AGENT_PRESENTATION: Record<string, { kind: PlaygroundNodeKind; label: string }> = {
  sql_agent: { kind: 'sql-agent', label: 'SQL Agent' },
  eda_agent: { kind: 'EDA-agent', label: 'EDA Agent' },
  analysis_agent: { kind: 'analysis-agent', label: 'Analysis Agent' },
  insight: { kind: 'insight-agent', label: 'Insight Agent' },
};

const LIFECYCLE_EVENTS = new Set([
  'agent.started',
  'agent.progress',
  'agent.retrying',
  'agent.waiting',
  'agent.resumed',
  'agent.completed',
  'agent.discarded',
  'agent.failed',
]);

const STAGE_DEPTH_BY_AGENT: Record<string, number> = {
  sql_agent: 1,
  eda_agent: 2,
  analysis_agent: 3,
  insight: 4,
};

const NODE_X_GAP = 460;
const LANE_Y_START = 120;
const LANE_Y_GAP = 240;

type RuntimeNode = Node<PlaygroundNodeData> & {
  data: PlaygroundNodeData & {
    nodeSequence: number;
    parentNodeId: string | null;
    agentName: string;
  };
};

function metadataString(event: RunEvent, key: string): string | null {
  const value = event.metadata?.[key];
  return typeof value === 'string' && value ? value : null;
}

function metadataNumber(event: RunEvent, key: string): number | null {
  const value = event.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function statusFromEvent(event: RunEvent): PlaygroundNodeStatus {
  if (event.event_type === 'agent.completed') return 'success';
  if (event.event_type === 'agent.failed') return 'error';
  if (event.event_type === 'agent.waiting') return 'waiting';
  return 'running';
}

function summaryFromEvent(event: RunEvent): string {
  const summary = event.metadata?.summary;
  if (summary && typeof summary === 'object' && 'summary' in summary) {
    const value = (summary as { summary?: unknown }).summary;
    if (typeof value === 'string' && value) return value;
  }
  return event.message;
}

export function deriveNodeGraphFromEvents(
  events: RunEvent[],
  baseNodes: Node<PlaygroundNodeData>[],
  _baseEdges: Edge[],
): { nodes: Node<PlaygroundNodeData>[]; edges: Edge[] } {
  const datasource = baseNodes.find((node) => node.id === 'datasource');
  const runtimeNodes = new Map<string, RuntimeNode>();

  for (const event of events) {
    if (!LIFECYCLE_EVENTS.has(event.event_type)) continue;

    const nodeId = metadataString(event, 'node_id');
    if (!nodeId) continue;
    if (event.event_type === 'agent.discarded') {
      runtimeNodes.delete(nodeId);
      continue;
    }

    const agentName = metadataString(event, 'agent_name') ?? event.node_name ?? '';
    const presentation = AGENT_PRESENTATION[agentName];
    if (!presentation) continue;

    const previous = runtimeNodes.get(nodeId);
    const nodeSequence = metadataNumber(event, 'node_sequence')
      ?? previous?.data.nodeSequence
      ?? runtimeNodes.size + 1;
    const parentNodeId = metadataString(event, 'parent_node_id')
      ?? previous?.data.parentNodeId
      ?? null;

    runtimeNodes.set(nodeId, {
      id: nodeId,
      type: 'playground',
      position: previous?.position ?? { x: nodeSequence * 460, y: 120 },
      data: {
        label: presentation.label,
        description: summaryFromEvent(event),
        kind: presentation.kind,
        status: statusFromEvent(event),
        eventType: event.event_type,
        lastMessage: event.message,
        lastEventAt: event.created_at,
        runId: event.run_id,
        nodeSequence,
        parentNodeId,
        agentName,
      },
    });
  }

  const orderedRuntimeNodes = [...runtimeNodes.values()].sort(
    (left, right) => left.data.nodeSequence - right.data.nodeSequence,
  );
  const laneByRunId = new Map<string, number>();
  const positionedNodes: RuntimeNode[] = [];

  for (const node of orderedRuntimeNodes) {
    const runId = node.data.runId ?? node.id;
    let laneIndex = laneByRunId.get(runId);
    if (laneIndex === undefined) {
      laneIndex = laneByRunId.size;
      laneByRunId.set(runId, laneIndex);
    }
    const depth = STAGE_DEPTH_BY_AGENT[node.data.agentName] ?? node.data.nodeSequence;
    positionedNodes.push({
      ...node,
      position: {
        x: depth * NODE_X_GAP,
        y: LANE_Y_START + laneIndex * LANE_Y_GAP,
      },
    });
  }

  const executionNodes = positionedNodes;
  const nodes = datasource ? [datasource, ...executionNodes] : executionNodes;
  const visibleIds = new Set(nodes.map((node) => node.id));
  const edges = executionNodes.map((node) => {
    const requestedParent = node.data.parentNodeId;
    const source = requestedParent && visibleIds.has(requestedParent)
      ? requestedParent
      : 'datasource';
    const isActive = node.data.status === 'running';
    return {
      id: `${source}-to-${node.id}`,
      source,
      target: node.id,
      type: 'playground',
      selectable: false,
      animated: false,
      zIndex: isActive ? 10 : 0,
      data: { flowState: isActive ? 'active' : 'idle' },
    } satisfies Edge;
  });

  return { nodes, edges };
}
