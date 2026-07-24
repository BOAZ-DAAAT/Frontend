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
  baseNodes: Node<PlaygroundNodeData>[],
  _baseEdges: Edge[],
): { nodes: Node<PlaygroundNodeData>[]; edges: Edge[] } {
  const datasource = baseNodes.find((node) => node.id === 'datasource');
  const runtimeNodes = new Map<string, RuntimeNode>();
  const queryByRunId = new Map<string, { label: string; text: string }>();

  for (const event of events) {
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

  const orderedRuntimeNodes = [...runtimeNodes.values()].sort(
    (left, right) => left.data.nodeSequence - right.data.nodeSequence,
  );
  const laneByRunId = new Map<string, number>();
  const firstNodeIdByRunId = new Map<string, string>();
  const positionedNodes: RuntimeNode[] = [];
  // parentNodeId가 없는(=분기가 아니라 새 메인 쿼리로 시작한) run만 자기 Data Source를 갖는다.
  const mainRunIds: string[] = [];
  const seenMainRunIds = new Set<string>();
  for (const node of orderedRuntimeNodes) {
    if (node.data.parentNodeId !== null || !node.data.runId || seenMainRunIds.has(node.data.runId)) continue;
    seenMainRunIds.add(node.data.runId);
    mainRunIds.push(node.data.runId);
  }

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
    const depth = STAGE_DEPTH_BY_AGENT[node.data.agentName] ?? node.data.nodeSequence;
    const queryInfo = firstNodeIdByRunId.get(runId) === node.id ? queryByRunId.get(runId) : undefined;
    positionedNodes.push({
      ...node,
      position: {
        x: depth * NODE_X_GAP,
        y: LANE_Y_START + laneIndex * LANE_Y_GAP,
      },
      data: {
        ...node.data,
        queryLabel: queryInfo?.label,
        queryText: queryInfo?.text,
      },
    });
  }

  const executionNodes = positionedNodes;
  // 메인 쿼리로 시작한 run마다(분기 제외) 자기 Data Source 노드를 하나씩 둔다.
  const datasourceNodes: Node<PlaygroundNodeData>[] = datasource
    ? (mainRunIds.length > 0
        ? mainRunIds.map((runId) => ({
            ...datasource,
            id: `datasource:${runId}`,
            position: { x: 0, y: LANE_Y_START + (laneByRunId.get(runId) ?? 0) * LANE_Y_GAP },
            data: { ...datasource.data, runId },
          }))
        : [datasource])
    : [];
  const nodes = [...datasourceNodes, ...executionNodes];
  const visibleIds = new Set(nodes.map((node) => node.id));
  const runIdByNodeId = new Map(executionNodes.map((node) => [node.id, node.data.runId]));
  // run별로 depth(=파이프라인 단계) → nodeId. 분기 진입 엣지를 "원본 run의 한 단계 앞"으로
  // 되돌려 보낼 때 쓴다(아래 참고).
  const nodeIdByRunAndDepth = new Map<string, Map<number, string>>();
  for (const node of executionNodes) {
    if (!node.data.runId) continue;
    const depth = STAGE_DEPTH_BY_AGENT[node.data.agentName];
    if (depth === undefined) continue;
    if (!nodeIdByRunAndDepth.has(node.data.runId)) nodeIdByRunAndDepth.set(node.data.runId, new Map());
    nodeIdByRunAndDepth.get(node.data.runId)!.set(depth, node.id);
  }
  const edges = executionNodes.map((node) => {
    const requestedParent = node.data.parentNodeId;
    const fallbackSource = node.data.runId ? `datasource:${node.data.runId}` : 'datasource';
    let source = requestedParent && visibleIds.has(requestedParent)
      ? requestedParent
      : fallbackSource;

    // 분기 진입 노드(parent가 다른 run에 속함 = 그 노드에서 "분기해서" 새 run이 시작됨)는
    // 클릭했던 그 노드 자체가 아니라, 원본 run에서 "그 단계 바로 앞"에서 뻗어나온 것처럼
    // 그린다 — 분기는 그 앞단 산출물을 그대로 이어받아 재실행하는 것이지, 같은 단계
    // 노드가 같은 단계 노드를 낳는 게 아니기 때문이다(EDA 분기 → SQL에서, 분석 분기 →
    // EDA에서, SQL 분기 → Data Source에서).
    const parentRunId = requestedParent ? runIdByNodeId.get(requestedParent) : undefined;
    if (requestedParent && parentRunId && parentRunId !== node.data.runId) {
      const depth = STAGE_DEPTH_BY_AGENT[node.data.agentName];
      const previousStageId = depth !== undefined
        ? nodeIdByRunAndDepth.get(parentRunId)?.get(depth - 1)
        : undefined;
      const rootDatasourceId = `datasource:${parentRunId}`;
      if (previousStageId && visibleIds.has(previousStageId)) {
        source = previousStageId;
      } else if (visibleIds.has(rootDatasourceId)) {
        source = rootDatasourceId;
      }
    }
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
