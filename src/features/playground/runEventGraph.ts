import type { Edge, Node } from '@xyflow/react';

import type { RunEvent } from '@/features/runs/types';

import type { PlaygroundNodeData, PlaygroundNodeStatus } from './types';

const BACKEND_NODE_TO_PLAYGROUND_ID: Record<string, string> = {
  sql_agent: 'sql-agent',
  eda_agent: 'eda-agent',
  analysis_agent: 'analysis-agent',
  insight_agent: 'insight-agent',
};

const NODE_ORDER = ['datasource', 'sql-agent', 'eda-agent', 'analysis-agent', 'insight-agent'];

function stringFromMetadata(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function nodeIdFromEvent(event: RunEvent): string | null {
  const metadataNode = stringFromMetadata(event.metadata?.agent_name)
    ?? stringFromMetadata(event.metadata?.agent)
    ?? stringFromMetadata(event.metadata?.node_name);
  const rawNodeName = event.node_name || metadataNode;

  if (rawNodeName && BACKEND_NODE_TO_PLAYGROUND_ID[rawNodeName]) {
    return BACKEND_NODE_TO_PLAYGROUND_ID[rawNodeName];
  }

  if (event.event_type === 'analysis.progress') {
    return 'analysis-agent';
  }

  const stagedAgent = event.message.match(/^(sql_agent|eda_agent|analysis_agent|insight_agent)\b/)?.[1];
  if (stagedAgent && BACKEND_NODE_TO_PLAYGROUND_ID[stagedAgent]) {
    return BACKEND_NODE_TO_PLAYGROUND_ID[stagedAgent];
  }

  return null;
}

function statusFromEvent(event: RunEvent): PlaygroundNodeStatus | null {
  if (event.event_type === 'node.started') return 'running';
  if (event.event_type === 'node.failed' || event.event_type === 'run.failed') return 'error';
  if (
    event.event_type === 'node.completed'
    || event.event_type === 'result.staged'
    || event.event_type === 'evidence.promoted'
    || event.event_type === 'run.completed'
  ) {
    return 'success';
  }

  if (event.event_type === 'analysis.progress') {
    const status = event.metadata?.status;
    if (status === 'started') return 'running';
    if (status === 'completed') return 'success';
    if (status === 'failed') return 'error';
  }

  return null;
}

function orderedNodes(nodes: Node<PlaygroundNodeData>[]) {
  return [...nodes].sort((left, right) => {
    const leftIndex = NODE_ORDER.indexOf(left.id);
    const rightIndex = NODE_ORDER.indexOf(right.id);
    return (leftIndex === -1 ? NODE_ORDER.length : leftIndex) - (rightIndex === -1 ? NODE_ORDER.length : rightIndex);
  });
}

export function deriveNodeGraphFromEvents(
  events: RunEvent[],
  baseNodes: Node<PlaygroundNodeData>[],
  baseEdges: Edge[],
): { nodes: Node<PlaygroundNodeData>[]; edges: Edge[] } {
  const nodesById = new Map(baseNodes.map((node) => [node.id, node]));
  const visibleNodeIds = new Set([
    'datasource',
    'sql-agent',
  ]);
  const nodeDataById = new Map<string, Partial<PlaygroundNodeData>>();

  for (const event of events) {
    const nodeId = nodeIdFromEvent(event);
    if (!nodeId || !nodesById.has(nodeId)) continue;

    visibleNodeIds.add(nodeId);
    const nextStatus = statusFromEvent(event);
    const previousData = nodeDataById.get(nodeId) ?? {};
    nodeDataById.set(nodeId, {
      ...previousData,
      ...(nextStatus ? { status: nextStatus } : {}),
      description: event.message,
      eventType: event.event_type,
      lastMessage: event.message,
      lastEventAt: event.created_at,
    });
  }

  const nodes = orderedNodes(
    Array.from(visibleNodeIds)
      .map((nodeId) => {
        const node = nodesById.get(nodeId);
        if (!node) return null;
        return {
          ...node,
          data: {
            ...node.data,
            ...(nodeDataById.get(nodeId) ?? {}),
          },
        };
      })
      .filter((node): node is Node<PlaygroundNodeData> => Boolean(node)),
  );
  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const edges = baseEdges
    .filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target))
    .map((edge) => ({
      ...edge,
      selectable: false,
      zIndex: edge.data?.flowState === 'active' ? 10 : 0,
    }));

  return { nodes, edges };
}
