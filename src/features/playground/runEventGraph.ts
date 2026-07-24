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

const TERMINAL_RUN_EVENTS = new Set([
  'run.completed',
  'run.failed',
  'run.cancelled',
]);

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

type RunVisualState = {
  latestLifecycleEvent: string | null;
  parentNodeId: string | null;
  terminal: boolean;
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

function metadataNestedString(event: RunEvent, parentKey: string, key: string): string | null {
  const parent = event.metadata?.[parentKey];
  if (!parent || typeof parent !== 'object') return null;
  const value = (parent as Record<string, unknown>)[key];
  return typeof value === 'string' && value ? value : null;
}

function branchInstructionFromMessage(message: string): string | null {
  const match = message.match(/^'(.+)' 지시사항으로 /);
  return match?.[1] ?? null;
}

function queryInfoFromEvent(event: RunEvent): { label: string; text: string } | null {
  const branchInstruction = metadataString(event, 'branch_instruction')
    ?? metadataNestedString(event, 'summary', 'branch_instruction')
    ?? (event.event_type === 'branch.started' ? branchInstructionFromMessage(event.message) : null);
  if (branchInstruction) {
    return { label: '분기 쿼리', text: branchInstruction };
  }

  const query = metadataString(event, 'query')
    ?? metadataString(event, 'user_query')
    ?? metadataNestedString(event, 'summary', 'query');
  if (query) {
    return { label: '원본 쿼리', text: query };
  }

  return null;
}

export function deriveNodeGraphFromEvents(
  events: RunEvent[],
  _baseNodes: Node<PlaygroundNodeData>[],
  _baseEdges: Edge[],
  pendingRunId: string | null = null,
): { nodes: Node<PlaygroundNodeData>[]; edges: Edge[] } {
  const runtimeNodes = new Map<string, RuntimeNode>();
  const queryByRunId = new Map<string, { label: string; text: string }>();
  const runVisualState = new Map<string, RunVisualState>();
  const runOrder: string[] = [];

  for (const event of events) {
    let visualState = runVisualState.get(event.run_id);
    if (!visualState) {
      visualState = {
        latestLifecycleEvent: null,
        parentNodeId: null,
        terminal: false,
      };
      runVisualState.set(event.run_id, visualState);
      runOrder.push(event.run_id);
    }
    if (LIFECYCLE_EVENTS.has(event.event_type)) {
      visualState.latestLifecycleEvent = event.event_type;
    }
    if (TERMINAL_RUN_EVENTS.has(event.event_type)) {
      visualState.terminal = true;
    }
    visualState.parentNodeId = metadataString(event, 'parent_node_id')
      ?? visualState.parentNodeId;

    const queryInfo = queryInfoFromEvent(event);
    if (queryInfo && !queryByRunId.has(event.run_id)) {
      queryByRunId.set(event.run_id, queryInfo);
    }

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

  if (pendingRunId && !runVisualState.has(pendingRunId)) {
    runVisualState.set(pendingRunId, {
      latestLifecycleEvent: null,
      parentNodeId: null,
      terminal: false,
    });
    runOrder.push(pendingRunId);
  }

  const orderedRuntimeNodes = [...runtimeNodes.values()].sort(
    (left, right) => left.data.nodeSequence - right.data.nodeSequence,
  );
  const laneByRunId = new Map<string, number>();
  const firstNodeIdByRunId = new Map<string, string>();
  const positionedNodeById = new Map<string, RuntimeNode>();
  const previousNodeIdByRunId = new Map<string, string>();
  const positionedNodes: RuntimeNode[] = [];
  for (const node of orderedRuntimeNodes) {
    const runId = node.data.runId ?? node.id;
    let laneIndex = laneByRunId.get(runId);
    if (laneIndex === undefined) {
      laneIndex = laneByRunId.size;
      laneByRunId.set(runId, laneIndex);
    }
    if (!firstNodeIdByRunId.has(runId)) {
      firstNodeIdByRunId.set(runId, node.id);
    }
    const requestedParent = node.data.parentNodeId;
    const previousNodeId = previousNodeIdByRunId.get(runId);
    const sourceNode = requestedParent
      ? positionedNodeById.get(requestedParent)
      : previousNodeId
        ? positionedNodeById.get(previousNodeId)
        : undefined;
    const queryInfo = firstNodeIdByRunId.get(runId) === node.id ? queryByRunId.get(runId) : undefined;
    const positionedNode = {
      ...node,
      position: {
        x: sourceNode ? sourceNode.position.x + NODE_X_GAP : 0,
        y: LANE_Y_START + laneIndex * LANE_Y_GAP,
      },
      data: {
        ...node.data,
        queryLabel: queryInfo?.label,
        queryText: queryInfo?.text,
      },
    };
    positionedNodes.push(positionedNode);
    positionedNodeById.set(node.id, positionedNode);
    previousNodeIdByRunId.set(runId, node.id);
  }

  for (const runId of runOrder) {
    const visualState = runVisualState.get(runId);
    if (
      !visualState
      || visualState.terminal
      || !(
        visualState.latestLifecycleEvent === null
        || visualState.latestLifecycleEvent === 'agent.completed'
      )
    ) {
      continue;
    }

    let laneIndex = laneByRunId.get(runId);
    if (laneIndex === undefined) {
      laneIndex = laneByRunId.size;
      laneByRunId.set(runId, laneIndex);
    }

    const previousNodeId = previousNodeIdByRunId.get(runId);
    const requestedParentId = previousNodeId ?? visualState.parentNodeId;
    const sourceNode = requestedParentId
      ? positionedNodeById.get(requestedParentId)
      : undefined;
    const previousSequence = sourceNode?.data.nodeSequence ?? 0;
    const queryInfo = queryByRunId.get(runId);
    const selectingNode: RuntimeNode = {
      id: `selecting:${runId}`,
      type: 'playground',
      position: {
        x: sourceNode ? sourceNode.position.x + NODE_X_GAP : 0,
        y: LANE_Y_START + laneIndex * LANE_Y_GAP,
      },
      data: {
        label: '다음 Agent 선택 중',
        description: '분석 계획과 현재 근거를 검토하고 있습니다.',
        kind: 'supervisor',
        status: 'selecting',
        eventType: 'supervisor.selecting',
        lastMessage: '다음 Agent를 선택하고 있습니다.',
        runId,
        nodeSequence: previousSequence + 1,
        parentNodeId: requestedParentId ?? null,
        agentName: 'supervisor',
        queryLabel: previousNodeId ? undefined : queryInfo?.label,
        queryText: previousNodeId ? undefined : queryInfo?.text,
      },
    };
    positionedNodes.push(selectingNode);
    positionedNodeById.set(selectingNode.id, selectingNode);
    previousNodeIdByRunId.set(runId, selectingNode.id);
  }

  const executionNodes = positionedNodes;
  const nodes = executionNodes;
  const visibleIds = new Set(nodes.map((node) => node.id));
  const edgePreviousNodeIdByRunId = new Map<string, string>();
  const edges = executionNodes.flatMap((node) => {
    const requestedParent = node.data.parentNodeId;
    const runId = node.data.runId;
    const source = requestedParent && visibleIds.has(requestedParent)
      ? requestedParent
      : runId
        ? edgePreviousNodeIdByRunId.get(runId)
        : undefined;
    if (runId) edgePreviousNodeIdByRunId.set(runId, node.id);
    if (!source || source === node.id) return [];

    const isActive = (
      node.data.status === 'selecting'
      || node.data.status === 'running'
      || node.data.status === 'waiting'
    );
    return [{
      id: `${source}-to-${node.id}`,
      source,
      target: node.id,
      type: 'playground',
      selectable: false,
      animated: false,
      zIndex: isActive ? 10 : 0,
      data: { flowState: isActive ? 'active' : 'idle' },
    } satisfies Edge];
  });

  return { nodes, edges };
}
