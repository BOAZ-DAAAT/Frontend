import {
  ReactFlow,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeChange,
  type OnNodeDrag,
  type ReactFlowInstance,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

import '@xyflow/react/dist/style.css';

import {
  branchAgentRun,
  cancelAgentRun,
  createAgentRun,
  deleteAgentRun,
  deleteAgentSessionRuns,
  listAgentRunRelatedEvents,
  listAgentSessionEvents,
  resumeAgentRun,
  resumeAgentRunAnalysisReview,
  resumeAgentRunApproval,
  type BranchStage,
} from '@/features/agent-runs/api';
import {
  clearStoredActiveRunId,
  getStoredActiveRunId,
  setStoredActiveRunId,
} from '@/features/agent-runs/activeRunStorage';
import { useAgentRunStream } from '@/features/agent-runs/hooks';
import { PlaygroundEdge } from '@/features/playground/edge/PlaygroundEdge';
import {
  clearStoredPlaygroundGraph,
  getStoredPlaygroundGraph,
  setStoredPlaygroundGraph,
} from '@/features/playground/graphStorage';
import { playgroundEdges, playgroundNodes } from '@/features/playground/mocks';
import type { CreatableNodeKind } from '@/features/playground/node-editor';
import { PlaygroundNode } from '@/features/playground/node/PlaygroundNode';
import { getAgentNodeSummary } from '@/features/playground/node-summary/api';
import type { NodeSummary } from '@/features/playground/node-summary/types';
import { createAgentNodeReport } from '@/features/playground/report/api';
import { notifyReportsUpdated } from '@/features/playground/report/reportEvents';
import type { AgentNodeReportResponse } from '@/features/playground/report/types';
import { deriveNodeGraphFromEvents } from '@/features/playground/runEventGraph';
import { useSidebar } from '@/features/playground/sidebar/SidebarContext';
import { useMode } from '@/features/playground/toolbar/ModeContext';
import type { PlaygroundNodeData, PlaygroundNodeQuery } from '@/features/playground/types';
import type { RunEvent, RunSummary } from '@/features/runs/types';
import { getSession } from '@/features/session/api';
import { getCurrentSessionId } from '@/features/session/currentSession';
import type { Session } from '@/features/session/types';
import { BackendApiError } from '@/lib/apiClient';

import { PlaygroundOverlay } from './PlaygroundOverlay';
import type { Report } from '@/features/playground/report/reportData';
import styles from './PlaygroundCanvas.module.css';

// 모듈 레벨 상수 (매 렌더 재생성 방지)
const nodeTypes = { playground: PlaygroundNode };
const edgeTypes = { playground: PlaygroundEdge };
const ALIGNMENT_SNAP_THRESHOLD = 56;
const ALIGNMENT_SNAP_DURATION = 260;
const FALLBACK_NODE_WIDTH = 320;
const FOLLOW_RESPONSE = 0.3;
const NODE_CREATION_X_GAP = 460;
const NODE_CREATION_BRANCH_Y_GAP = 240;
const COLLISION_SEARCH_LIMIT = 200;
const COLLISION_FALLBACK_GAP = 32;
const INITIAL_NODE_WIDTH = 368;
const INITIAL_NODE_HEIGHT = 156;
const NEW_PROMPT_NODE_Y_GAP = 220;
const QUERY_BADGE_HEIGHT = 30;
const QUERY_BADGE_GAP = 6;
const QUERY_BADGE_OFFSET = 8;
const TERMINAL_RUN_STATUSES = new Set<RunSummary['status']>([
  'succeeded',
  'failed',
  'cancelled',
]);

function createDatasourceNode(
  datasourceNodeId: string,
  session: Session | null,
  position: { x: number; y: number },
  animateOnCreate = false,
): Node<PlaygroundNodeData> {
  return {
    id: datasourceNodeId,
    type: 'playground',
    position,
    data: {
      label: 'Data Source',
      description: session
        ? [
            '원본 데이터 연결이 완료되었습니다.',
            `Database: ${session.source_database}`,
          ].join('\n')
        : '분석에 사용할 원본 데이터 소스가 연결되었습니다.',
      kind: 'datasource',
      status: 'success',
      nodeSequence: 0,
      parentNodeId: null,
      agentName: 'datasource',
      animateOnCreate,
    },
  };
}

const NODE_DEFAULTS: Record<CreatableNodeKind, Pick<PlaygroundNodeData, 'label' | 'description'>> = {
  'sql-agent': {
    label: 'SQL Agent',
    description: '새 SQL 작업을 작성하세요.',
  },
  'EDA-agent': {
    label: 'EDA Agent',
    description: '새 탐색 작업을 작성하세요.',
  },
  'analysis-agent': {
    label: 'Analysis Agent',
    description: '새 분석 작업을 작성하세요.',
  },
  'insight-agent': {
    label: 'Insight Agent',
    description: '새 인사이트 작업을 작성하세요.',
  },
};

const BRANCH_STAGE_BY_NODE_KIND: Partial<Record<PlaygroundNodeData['kind'], BranchStage>> = {
  'sql-agent': 'sql',
  'EDA-agent': 'eda',
  'analysis-agent': 'analysis',
  'insight-agent': 'insight',
};

type PlaygroundCanvasProps = {
  preview: { sessionId: string; table: string } | null;
  onClosePreview: () => void;
  isLeavingForSessions: boolean;
  isEnteringFromSessions: boolean;
  initialGraphOverride?: PlaygroundInitialGraph;
  isolated?: boolean;
  reportsOverride?: Report[];
};

export type PlaygroundInitialGraph = {
  nodes: Array<Node<PlaygroundNodeData>>;
  edges: Edge[];
};

type Clarification = {
  eventId: string | null;
  requestKey: string;
  agentName: string;
  question: string;
};

type Approval = {
  eventId: string | null;
  requestKey: string;
  agentName: string;
  reason: string;
};

type AnalysisReview = {
  eventId: string | null;
  requestKey: string;
  approvalId: string;
  agentName: string;
  content: string;
  options: Array<{
    id: string;
    label: string;
    recommended: boolean;
  }>;
  allowFreeText: boolean;
};

type SelectedNodeSummary = {
  id: string;
  runId: string | null;
  label: string;
  kind: PlaygroundNodeData['kind'];
  status: PlaygroundNodeData['status'];
  parentNodeId: string | null;
};

type ActiveFlowTarget = {
  nodeId: string | null;
  runId: string | null;
};

type NodeSummaryRequest = {
  data: NodeSummary | null;
  error: string | null;
  isLoading: boolean;
};

type NodeReportRequest = {
  data: AgentNodeReportResponse | null;
  error: string | null;
  isLoading: boolean;
};

function getDescendantDepths(edges: Edge[], rootId: string): Map<string, number> {
  const descendants = new Map<string, number>();
  const pending = [{ id: rootId, depth: 0 }];

  while (pending.length) {
    const parent = pending.shift();
    if (!parent) continue;

    for (const edge of edges) {
      if (edge.source !== parent.id || descendants.has(edge.target) || edge.target === rootId) {
        continue;
      }
      const depth = parent.depth + 1;
      descendants.set(edge.target, depth);
      pending.push({ id: edge.target, depth });
    }
  }

  return descendants;
}

function getNewPromptNodePosition(
  currentNodes: Array<Node<PlaygroundNodeData>>,
  viewportCenter: { x: number; y: number },
) {
  const datasourceNode = currentNodes.find((node) => node.data.kind === 'datasource');
  const flowNodes = currentNodes.filter((node) => node.data.kind !== 'datasource');

  if (!flowNodes.length) {
    if (datasourceNode) {
      return {
        x: datasourceNode.position.x + NODE_CREATION_X_GAP,
        y: datasourceNode.position.y,
      };
    }
    return {
      x: viewportCenter.x - INITIAL_NODE_WIDTH / 2,
      y: viewportCenter.y - INITIAL_NODE_HEIGHT / 2,
    };
  }

  const flowStartX = Math.min(...flowNodes.map((node) => node.position.x));
  const flowBottom = Math.max(...flowNodes.map((node) => (
    node.position.y + (node.measured?.height ?? node.height ?? INITIAL_NODE_HEIGHT)
  )));

  return {
    x: flowStartX,
    y: flowBottom + NEW_PROMPT_NODE_Y_GAP,
  };
}

function getNodeCollisionBounds(
  node: Node<PlaygroundNodeData>,
  position: { x: number; y: number },
) {
  const queryBadgeCount = node.data.queryBadges?.length
    ?? (node.data.queryLabel && node.data.queryText ? 1 : 0);
  const width = node.measured?.width ?? node.width ?? FALLBACK_NODE_WIDTH;
  const height = node.measured?.height ?? node.height ?? INITIAL_NODE_HEIGHT;
  const queryBadgeHeight = queryBadgeCount
    ? QUERY_BADGE_OFFSET + queryBadgeCount * QUERY_BADGE_HEIGHT + (queryBadgeCount - 1) * QUERY_BADGE_GAP
    : 0;
  const top = position.y - queryBadgeHeight;

  return {
    left: position.x,
    right: position.x + width,
    top,
    bottom: position.y + height,
  };
}

function boundsOverlap(
  left: ReturnType<typeof getNodeCollisionBounds>,
  right: ReturnType<typeof getNodeCollisionBounds>,
) {
  return (
    left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top
  );
}

function overlapsAnyNode(
  node: Node<PlaygroundNodeData>,
  position: { x: number; y: number },
  occupiedNodes: Array<Node<PlaygroundNodeData>>,
  ignoredNodeIds: Set<string> = new Set([node.id]),
) {
  const bounds = getNodeCollisionBounds(node, position);
  return occupiedNodes.some((occupiedNode) => (
    !ignoredNodeIds.has(occupiedNode.id)
    && boundsOverlap(
      bounds,
      getNodeCollisionBounds(occupiedNode, occupiedNode.position),
    )
  ));
}

function findNonOverlappingPosition(
  node: Node<PlaygroundNodeData>,
  preferredPosition: { x: number; y: number },
  occupiedNodes: Array<Node<PlaygroundNodeData>>,
) {
  for (let laneOffset = 0; laneOffset < COLLISION_SEARCH_LIMIT; laneOffset += 1) {
    const candidate = {
      x: preferredPosition.x,
      y: preferredPosition.y + laneOffset * NODE_CREATION_BRANCH_Y_GAP,
    };
    if (!overlapsAnyNode(node, candidate, occupiedNodes)) return candidate;
  }
  const maxOccupiedBottom = Math.max(
    preferredPosition.y,
    ...occupiedNodes
      .filter((occupiedNode) => occupiedNode.id !== node.id)
      .map((occupiedNode) => (
        getNodeCollisionBounds(occupiedNode, occupiedNode.position).bottom
      )),
  );
  const preferredBounds = getNodeCollisionBounds(node, preferredPosition);
  return {
    x: preferredPosition.x,
    y: maxOccupiedBottom
      + COLLISION_FALLBACK_GAP
      + (preferredPosition.y - preferredBounds.top),
  };
}

function findNonOverlappingFlowStartPosition(
  rootNode: Node<PlaygroundNodeData>,
  datasourceNode: Node<PlaygroundNodeData>,
  preferredRootPosition: { x: number; y: number },
  occupiedNodes: Array<Node<PlaygroundNodeData>>,
) {
  const ignoredNodeIds = new Set([rootNode.id, datasourceNode.id]);

  for (let laneOffset = 0; laneOffset < COLLISION_SEARCH_LIMIT; laneOffset += 1) {
    const rootPosition = {
      x: preferredRootPosition.x,
      y: preferredRootPosition.y + laneOffset * NODE_CREATION_BRANCH_Y_GAP,
    };
    const datasourcePosition = {
      x: rootPosition.x - NODE_CREATION_X_GAP,
      y: rootPosition.y,
    };
    if (
      !overlapsAnyNode(rootNode, rootPosition, occupiedNodes, ignoredNodeIds)
      && !overlapsAnyNode(datasourceNode, datasourcePosition, occupiedNodes, ignoredNodeIds)
    ) {
      return rootPosition;
    }
  }
  const maxOccupiedBottom = Math.max(
    preferredRootPosition.y,
    ...occupiedNodes
      .filter((node) => !ignoredNodeIds.has(node.id))
      .map((node) => getNodeCollisionBounds(node, node.position).bottom),
  );
  const rootBounds = getNodeCollisionBounds(rootNode, preferredRootPosition);
  const datasourceBounds = getNodeCollisionBounds(datasourceNode, {
    x: preferredRootPosition.x - NODE_CREATION_X_GAP,
    y: preferredRootPosition.y,
  });
  const topOffset = Math.max(
    preferredRootPosition.y - rootBounds.top,
    preferredRootPosition.y - datasourceBounds.top,
  );
  return {
    x: preferredRootPosition.x,
    y: maxOccupiedBottom + COLLISION_FALLBACK_GAP + topOffset,
  };
}

function getDescendantNodeIds(edges: Edge[], rootId: string): Set<string> {
  return new Set(getDescendantDepths(edges, rootId).keys());
}

function getAncestorEdgeIds(edges: Edge[], targetIds: string[]): Set<string> {
  const ancestorEdgeIds = new Set<string>();
  const pending = [...targetIds];
  const visitedNodes = new Set(targetIds);

  while (pending.length) {
    const targetId = pending.pop();
    if (!targetId) continue;

    for (const edge of edges) {
      if (edge.target !== targetId || ancestorEdgeIds.has(edge.id)) continue;
      ancestorEdgeIds.add(edge.id);
      if (visitedNodes.has(edge.source)) continue;
      visitedNodes.add(edge.source);
      pending.push(edge.source);
    }
  }

  return ancestorEdgeIds;
}

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function metadataObject(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): Record<string, unknown> | null {
  const value = metadata?.[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function interruptType(metadata: Record<string, unknown> | null | undefined) {
  return metadataString(metadata, 'interrupt_type') ?? metadataString(metadata, 'type');
}

function getClarification(run: RunSummary | null, events: RunEvent[]): Clarification | null {
  let waitingEvent: RunEvent | null = null;
  let wasResumed = false;

  for (const event of events) {
    if (!run || event.run_id !== run.run_id) continue;
    if (
      event.event_type === 'human_input.required'
      && interruptType(event.metadata) === 'clarification'
    ) {
      waitingEvent = event;
      wasResumed = false;
    }
    if (
      event.event_type === 'human_input.resumed'
      && interruptType(event.metadata) === 'clarification'
    ) {
      waitingEvent = null;
      wasResumed = true;
    }
  }

  if (wasResumed) return null;
  if (!waitingEvent && (
    run?.status !== 'waiting_input'
    || interruptType(run.metadata) !== 'clarification'
  )) return null;

  const question = metadataString(waitingEvent?.metadata, 'question')
    ?? waitingEvent?.message
    ?? metadataString(run?.metadata, 'question')
    ?? '작업을 계속하려면 추가 정보가 필요합니다.';
  const rawAgentName = metadataString(waitingEvent?.metadata, 'agent_name')
    ?? waitingEvent?.node_name
    ?? metadataString(run?.metadata, 'node')
    ?? 'Agent';
  const agentName = rawAgentName === 'collect_clarification'
    ? 'Supervisor Agent'
    : rawAgentName;

  const eventId = waitingEvent?.event_id ?? null;
  return {
    eventId,
    requestKey: eventId ?? `${run?.run_id ?? 'run'}:clarification:${run?.updated_at ?? question}`,
    agentName,
    question,
  };
}

function getApproval(run: RunSummary | null, events: RunEvent[]): Approval | null {
  if (run?.status !== 'waiting_approval') return null;

  let waitingEvent: RunEvent | null = null;
  let wasResumed = false;
  for (const event of events) {
    if (event.run_id !== run.run_id) continue;
    if (
      event.event_type === 'human_input.required'
      && interruptType(event.metadata) === 'approval'
    ) {
      waitingEvent = event;
      wasResumed = false;
    } else if (event.event_type === 'agent.waiting' && waitingEvent === null) {
      // 이전 백엔드 이벤트도 복원할 수 있도록 유지한다.
      waitingEvent = event;
      wasResumed = false;
    }
    if (
      event.event_type === 'human_input.resumed'
      && interruptType(event.metadata) === 'approval'
    ) {
      waitingEvent = null;
      wasResumed = true;
    }
  }

  if (wasResumed) return null;
  const reason = waitingEvent?.message
    ?? metadataString(run.metadata, 'reason')
    ?? '결과를 승인해 주세요.';
  const rawAgentName = waitingEvent?.node_name ?? 'analysis_agent';

  const eventId = waitingEvent?.event_id ?? null;
  return {
    eventId,
    requestKey: eventId ?? `${run.run_id}:approval:${run.updated_at ?? reason}`,
    agentName: rawAgentName,
    reason,
  };
}

function getAnalysisReview(run: RunSummary | null, events: RunEvent[]): AnalysisReview | null {
  let reviewEvent: RunEvent | null = null;
  let wasResumed = false;

  for (const event of events) {
    if (!run || event.run_id !== run.run_id) continue;
    if (interruptType(event.metadata) !== 'analysis_review') continue;

    if (['approval.required', 'analysis_review.required', 'human_input.required'].includes(event.event_type)) {
      reviewEvent = event;
      wasResumed = false;
    }
    if (['approval.resolved', 'analysis_review.resolved', 'human_input.resumed'].includes(event.event_type)) {
      reviewEvent = null;
      wasResumed = true;
    }
  }

  if (wasResumed) return null;
  if (!reviewEvent && (
    run?.status !== 'waiting_approval'
    || interruptType(run.metadata) !== 'analysis_review'
  )) return null;

  const reviewRequest = metadataObject(reviewEvent?.metadata, 'review_request')
    ?? metadataObject(run?.metadata, 'review_request');
  const content = metadataString(reviewRequest, 'question')
    ?? metadataString(reviewRequest, 'proposal')
    ?? metadataString(reviewEvent?.metadata, 'answer')
    ?? metadataString(reviewEvent?.metadata, 'content')
    ?? metadataString(reviewEvent?.metadata, 'review')
    ?? reviewEvent?.message
    ?? metadataString(run?.metadata, 'answer')
    ?? '분석 결과를 검토한 뒤 진행 여부를 선택해 주세요.';
  const agentName = metadataString(reviewEvent?.metadata, 'agent_name')
    ?? reviewEvent?.node_name
    ?? metadataString(run?.metadata, 'node')
    ?? 'Analysis Agent';

  const approvalId = metadataString(reviewEvent?.metadata, 'approval_id')
    ?? reviewEvent?.approval_id
    ?? metadataString(run?.metadata, 'approval_id');
  if (!approvalId) return null;

  const rawOptions = reviewRequest?.options;
  const options = Array.isArray(rawOptions)
    ? rawOptions.flatMap((option) => {
        if (!option || typeof option !== 'object' || Array.isArray(option)) return [];
        const record = option as Record<string, unknown>;
        const id = typeof record.id === 'string' ? record.id.trim() : '';
        const label = typeof record.label === 'string' ? record.label.trim() : '';
        if (!id || !label) return [];
        return [{
          id,
          label,
          recommended: record.recommended === true,
        }];
      })
    : [];
  const eventId = reviewEvent?.event_id ?? null;

  return {
    eventId,
    requestKey: eventId ?? `${run?.run_id ?? 'run'}:analysis_review:${approvalId}`,
    approvalId,
    agentName,
    content,
    options,
    allowFreeText: reviewRequest?.allow_free_text !== false,
  };
}

function mergeRunEvents(previous: RunEvent[], next: RunEvent[]): RunEvent[] {
  const byId = new Map(previous.map((event) => [event.event_id, event]));
  for (const event of next) {
    byId.set(event.event_id, event);
  }
  return [...byId.values()].sort((left, right) => (
    (left.created_at ?? '').localeCompare(right.created_at ?? '')
  ));
}

const RETAINABLE_NODE_EVENTS = new Set([
  'supervisor.selection.started',
  'agent.started',
  'agent.progress',
  'agent.retrying',
  'agent.waiting',
  'agent.resumed',
  'agent.completed',
  'agent.failed',
  'agent.discarded',
  'human_input.resumed',
]);

function getExplicitlyRemovedEventNodeIds(events: RunEvent[]): Set<string> {
  const latestLifecycleByNodeId = new Map<
    string,
    {
      eventType: string;
      runId: string;
      agentName: string;
      attempt: number;
      reasonCode: string | null;
    }
  >();
  const terminalRunIds = new Set<string>();

  for (const event of events) {
    if (['run.completed', 'run.failed', 'run.cancelled'].includes(event.event_type)) {
      terminalRunIds.add(event.run_id);
    }
    if (!RETAINABLE_NODE_EVENTS.has(event.event_type)) continue;

    const nodeId = event.metadata?.node_id;
    if (typeof nodeId !== 'string' || !nodeId) continue;
    const metadataAgentName = event.metadata?.agent_name;
    const metadataAttempt = event.metadata?.attempt;
    const attempt = typeof metadataAttempt === 'number' && Number.isFinite(metadataAttempt)
      ? metadataAttempt
      : 0;
    const latestLifecycle = latestLifecycleByNodeId.get(nodeId);
    if (latestLifecycle && attempt < latestLifecycle.attempt) continue;
    latestLifecycleByNodeId.set(nodeId, {
      eventType: event.event_type,
      runId: event.run_id,
      agentName: typeof metadataAgentName === 'string'
        ? metadataAgentName
        : event.node_name ?? '',
      attempt,
      reasonCode: typeof event.metadata?.reason_code === 'string'
        ? event.metadata.reason_code
        : null,
    });
  }

  return new Set(
    [...latestLifecycleByNodeId]
      .filter(([, lifecycle]) => (
        (
          lifecycle.eventType === 'agent.discarded'
          && lifecycle.reasonCode !== 'run_cancelled'
        )
        || (
          lifecycle.agentName === 'supervisor'
          && terminalRunIds.has(lifecycle.runId)
        )
      ))
      .map(([nodeId]) => nodeId),
  );
}

export function PlaygroundCanvas({
  preview,
  onClosePreview,
  isLeavingForSessions,
  isEnteringFromSessions,
  initialGraphOverride,
  isolated = false,
  reportsOverride,
}: PlaygroundCanvasProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<
    ReactFlowInstance<Node<PlaygroundNodeData>, Edge> | null
  >(null);
  const initialGraph = useMemo(
    () => {
      if (!initialGraphOverride) {
        return deriveNodeGraphFromEvents([], playgroundNodes, playgroundEdges);
      }
      return {
        nodes: initialGraphOverride.nodes.map((node) => ({
          ...node,
          position: { ...node.position },
          data: {
            ...node.data,
            queryBadges: node.data.queryBadges?.map((query) => ({ ...query })),
          },
        })),
        edges: initialGraphOverride.edges.map((edge) => ({
          ...edge,
          data: edge.data ? { ...edge.data } : undefined,
        })),
      };
    },
    [initialGraphOverride],
  );
  const initialStoredGraph = useMemo(
    () => (
      isolated
        ? initialGraph
        : getStoredPlaygroundGraph(initialGraph.nodes, initialGraph.edges)
    ),
    [initialGraph, isolated],
  );
  const [nodes, setNodes] = useNodesState(initialStoredGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialStoredGraph.edges);
  const [activeFlowTarget, setActiveFlowTarget] = useState<ActiveFlowTarget | null>(() => {
    if (isolated) return null;
    const runId = getStoredActiveRunId();
    return runId ? { nodeId: null, runId } : null;
  });
  const [hoveredFlowNodeId, setHoveredFlowNodeId] = useState<string | null>(null);
  const [selectedNodeSummary, setSelectedNodeSummary] = useState<SelectedNodeSummary | null>(null);
  const [nodeSummaryRequest, setNodeSummaryRequest] = useState<NodeSummaryRequest>({
    data: null,
    error: null,
    isLoading: false,
  });
  const [nodeReportRequest, setNodeReportRequest] = useState<NodeReportRequest>({
    data: null,
    error: null,
    isLoading: false,
  });
  const reportRequestSequence = useRef(0);
  const hydratedSummaryNodes = useRef(new Set<string>());
  const hasReconciledEventGraph = useRef(false);
  const draggedNodeId = useRef<string | null>(null);
  const dragStartPositions = useRef(new Map<string, { x: number; y: number }>());
  const followTargets = useRef(new Map<string, { x: number; y: number }>());
  const followDepths = useRef(new Map<string, number>());
  const followAnimationFrame = useRef<number | null>(null);
  const snapAnimationFrame = useRef<number | null>(null);

  const [activeRunId, setActiveRunId] = useState<string | null>(() => (
    isolated ? null : getStoredActiveRunId()
  ));
  const [locallyStartedRunId, setLocallyStartedRunId] = useState<string | null>(null);
  const currentSessionId = isolated ? null : getCurrentSessionId();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isDeletingNodes, setIsDeletingNodes] = useState(false);
  const [deleteNodesError, setDeleteNodesError] = useState<string | null>(null);
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [isCancellingRun, setIsCancellingRun] = useState(false);
  const [cancelRunError, setCancelRunError] = useState<string | null>(null);
  const [isSubmittingClarification, setIsSubmittingClarification] = useState(false);
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [isSubmittingAnalysisReview, setIsSubmittingAnalysisReview] = useState(false);
  const [analysisReviewError, setAnalysisReviewError] = useState<string | null>(null);
  const [dismissedClarificationKey, setDismissedClarificationKey] = useState<string | null>(null);
  const [dismissedApprovalKey, setDismissedApprovalKey] = useState<string | null>(null);
  const [dismissedAnalysisReviewKey, setDismissedAnalysisReviewKey] = useState<string | null>(null);
  const {
    run,
    events,
    error: runStreamError,
    reconnect: reconnectRunStream,
  } = useAgentRunStream(isolated ? null : activeRunId);
  const [visibleEvents, setVisibleEvents] = useState<RunEvent[]>([]);

  useEffect(() => {
    if (isolated) return;
    if (!currentSessionId) {
      setCurrentSession(null);
      return;
    }

    let cancelled = false;
    void getSession(currentSessionId)
      .then((session) => {
        if (!cancelled) setCurrentSession(session);
      })
      .catch(() => {
        if (!cancelled) setCurrentSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentSessionId, isolated]);

  const handleDeleteRunStable = useCallback(async (runId: string, label: string) => {
    const shouldDelete = window.confirm(
      `${label} 노드가 속한 실행과 하위 분기 데이터를 모두 삭제할까요?\n\nrun_id: ${runId}`,
    );
    if (!shouldDelete) return;

    try {
      await deleteAgentRun(runId);
      const sessionId = getCurrentSessionId();
      const remainingEvents = sessionId
        ? await listAgentSessionEvents(sessionId)
        : visibleEvents.filter((event) => event.run_id !== runId);
      const remainingRunIds = new Set(remainingEvents.map((event) => event.run_id));
      const removedRunIds = new Set([
        runId,
        ...visibleEvents
          .map((event) => event.run_id)
          .filter((eventRunId) => !remainingRunIds.has(eventRunId)),
      ]);
      const belongsToRemovedRun = (nodeId: string) => (
        [...removedRunIds].some((removedRunId) => (
          nodeId === `datasource:${removedRunId}`
          || nodeId.startsWith(`${removedRunId}:`)
        ))
      );
      const fallbackRunId = remainingEvents[0]?.run_id ?? null;
      setVisibleEvents(remainingEvents);
      setNodes((currentNodes) => currentNodes.filter((node) => (
        !(
          node.data.runId
          && removedRunIds.has(node.data.runId)
        )
        && !belongsToRemovedRun(node.id)
      )));
      setEdges((currentEdges) => currentEdges.filter((edge) => (
        !belongsToRemovedRun(edge.source)
        && !belongsToRemovedRun(edge.target)
      )));
      setSelectedNodeSummary((selected) => (
        selected?.runId && !remainingRunIds.has(selected.runId) ? null : selected
      ));

      if (activeRunId && !remainingRunIds.has(activeRunId)) {
        setActiveRunId(fallbackRunId);
        if (fallbackRunId) {
          setStoredActiveRunId(fallbackRunId);
        } else {
          clearStoredActiveRunId();
        }
      }
      setActiveFlowTarget((current) => (
        current?.runId && !remainingRunIds.has(current.runId)
          ? (fallbackRunId ? { nodeId: null, runId: fallbackRunId } : null)
          : current
      ));
    } catch (error) {
      const message = error instanceof BackendApiError
        ? error.message
        : error instanceof Error
          ? error.message
        : 'run을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
      window.alert(message);
      throw error;
    }
  }, [activeRunId, setEdges, setNodes, visibleEvents]);

  useEffect(() => {
    setVisibleEvents((currentEvents) => mergeRunEvents(currentEvents, events));
  }, [events]);

  useEffect(() => {
    if (isolated) return;
    // 새로고침 직후엔 activeRunId의 계보만 들어와 있으니, 세션에서 시작한 다른 메인
    // 쿼리 트리들도 마운트 시점에 한 번 통째로 가져와 합쳐준다.
    const sessionId = getCurrentSessionId();
    if (!sessionId) return;
    let cancelled = false;
    void listAgentSessionEvents(sessionId)
      .then((sessionEvents) => {
        if (cancelled) return;
        setVisibleEvents((currentEvents) => mergeRunEvents(currentEvents, sessionEvents));
      })
      .catch(() => {
        // 세션 전체 히스토리 복원은 부가 기능이라 실패해도 현재 run 표시는 계속되어야 한다
      });
    return () => {
      cancelled = true;
    };
  }, [isolated]);

  useEffect(() => {
    if (isolated) return;
    setStoredPlaygroundGraph(nodes, edges);
  }, [edges, isolated, nodes]);

  useEffect(() => {
    if (isolated) return;
    // 새로고침으로 복원한 run_id가 더 이상 존재하지 않으면(삭제됨 등) 저장값을 비운다.
    if (runStreamError && !run) {
      clearStoredActiveRunId();
      setActiveRunId(null);
      setActiveFlowTarget(null);
    }
  }, [isolated, runStreamError, run]);

  const { collapse, view } = useSidebar();
  const { mode } = useMode();
  const isSessionView = view === 'sessions';
  const isVerifiedActiveRun = Boolean(
    activeRunId
    && run?.run_id === activeRunId
    && !TERMINAL_RUN_STATUSES.has(run.status),
  );
  const isLocallyStartedRunActive = Boolean(
    activeRunId
    && locallyStartedRunId === activeRunId
    && !(
      run?.run_id === activeRunId
      && TERMINAL_RUN_STATUSES.has(run.status)
    ),
  );
  const isRunActive = isVerifiedActiveRun || isLocallyStartedRunActive;
  const isGenerating = isStartingRun || isRunActive;
  const detectedClarification = useMemo(
    () => getClarification(run, visibleEvents),
    [visibleEvents, run],
  );
  const detectedApproval = useMemo(() => getApproval(run, visibleEvents), [visibleEvents, run]);
  const detectedAnalysisReview = useMemo(
    () => getAnalysisReview(run, visibleEvents),
    [visibleEvents, run],
  );
  const clarification = detectedClarification?.requestKey === dismissedClarificationKey
    ? null
    : detectedClarification;
  const approval = detectedApproval?.requestKey === dismissedApprovalKey
    ? null
    : detectedApproval;
  const analysisReview = detectedAnalysisReview?.requestKey === dismissedAnalysisReviewKey
    ? null
    : detectedAnalysisReview;
  const hasDeletableNodes = nodes.some((node) => node.data.kind !== 'datasource');

  const startDescendantFollow = () => {
    if (followAnimationFrame.current !== null) return;

    const animateFollowers = () => {
      let shouldContinue = false;

      setNodes((currentNodes) => currentNodes.map((node) => {
        const target = followTargets.current.get(node.id);
        const depth = followDepths.current.get(node.id);
        if (!target || !depth) return node;

        const response = FOLLOW_RESPONSE / (1 + (depth - 1) * 0.38);
        const nextPosition = {
          x: node.position.x + (target.x - node.position.x) * response,
          y: node.position.y + (target.y - node.position.y) * response,
        };

        if (
          Math.abs(target.x - nextPosition.x) > 0.2
          || Math.abs(target.y - nextPosition.y) > 0.2
        ) {
          shouldContinue = true;
        }

        return { ...node, position: nextPosition };
      }));

      if (shouldContinue && draggedNodeId.current) {
        followAnimationFrame.current = requestAnimationFrame(animateFollowers);
      } else {
        followAnimationFrame.current = null;
      }
    };

    followAnimationFrame.current = requestAnimationFrame(animateFollowers);
  };

  const stopDescendantFollow = () => {
    if (followAnimationFrame.current !== null) {
      cancelAnimationFrame(followAnimationFrame.current);
      followAnimationFrame.current = null;
    }
    followTargets.current.clear();
    followDepths.current.clear();
  };

  const handleNodesChange = (changes: NodeChange<Node<PlaygroundNodeData>>[]) => {
    setNodes((currentNodes) => {
      const dragRootId = draggedNodeId.current;
      const applicableChanges = dragRootId
        ? changes.filter((change) => change.type !== 'position' || change.id === dragRootId)
        : changes;
      return applyNodeChanges(applicableChanges, currentNodes);
    });
  };

  const handleNodeDragStart: OnNodeDrag<Node<PlaygroundNodeData>> = (_event, node) => {
    if (snapAnimationFrame.current !== null) {
      cancelAnimationFrame(snapAnimationFrame.current);
      snapAnimationFrame.current = null;
    }
    draggedNodeId.current = node.id;
    const descendantDepths = getDescendantDepths(edges, node.id);
    const movingIds = new Set(descendantDepths.keys());
    movingIds.add(node.id);
    followDepths.current = descendantDepths;
    followTargets.current.clear();
    dragStartPositions.current = new Map(
      nodes
        .filter((currentNode) => movingIds.has(currentNode.id))
        .map((currentNode) => [currentNode.id, { ...currentNode.position }]),
    );
    dragStartPositions.current.set(node.id, { ...node.position });
  };

  const handleNodeDrag: OnNodeDrag<Node<PlaygroundNodeData>> = (_event, draggedNode) => {
    const originalRootPosition = dragStartPositions.current.get(draggedNode.id);
    if (!originalRootPosition) return;

    const totalDelta = {
      x: draggedNode.position.x - originalRootPosition.x,
      y: draggedNode.position.y - originalRootPosition.y,
    };
    for (const nodeId of followDepths.current.keys()) {
      const originalPosition = dragStartPositions.current.get(nodeId);
      if (!originalPosition) continue;
      followTargets.current.set(nodeId, {
        x: originalPosition.x + totalDelta.x,
        y: originalPosition.y + totalDelta.y,
      });
    }
    startDescendantFollow();
  };

  const handleNodeDragStop: OnNodeDrag<Node<PlaygroundNodeData>> = (_event, draggedNode) => {
    draggedNodeId.current = null;
    stopDescendantFollow();

    const originalPositions = new Map(dragStartPositions.current);
    dragStartPositions.current.clear();
    const parentEdge = edges.find((edge) => edge.target === draggedNode.id);
    const parentNode = parentEdge
      ? nodes.find((node) => node.id === parentEdge.source)
      : null;
    const movingIds = getDescendantNodeIds(edges, draggedNode.id);
    movingIds.add(draggedNode.id);
    const startPositions = new Map(
      nodes
        .filter((node) => movingIds.has(node.id))
        .map((node) => [node.id, node.position]),
    );
    startPositions.set(draggedNode.id, draggedNode.position);
    const originalRootPosition = originalPositions.get(draggedNode.id) ?? draggedNode.position;
    const dragDelta = {
      x: draggedNode.position.x - originalRootPosition.x,
      y: draggedNode.position.y - originalRootPosition.y,
    };
    const translatedPositions = new Map(
      [...originalPositions].map(([nodeId, position]) => [
        nodeId,
        { x: position.x + dragDelta.x, y: position.y + dragDelta.y },
      ]),
    );
    const parentRight = parentNode
      ? parentNode.position.x
        + (parentNode.measured?.width ?? parentNode.width ?? FALLBACK_NODE_WIDTH)
      : Number.NEGATIVE_INFINITY;
    const hasCrossedParentBoundary = draggedNode.position.x < parentRight;
    const alignmentDeltaY = parentNode
      ? parentNode.position.y - draggedNode.position.y
      : 0;
    const shouldAlignVertically = (
      Boolean(parentNode)
      && Math.abs(alignmentDeltaY) <= ALIGNMENT_SNAP_THRESHOLD
      && Math.abs(alignmentDeltaY) >= 0.5
    );

    const proposedTargetPositions = shouldAlignVertically
      ? new Map(
        [...translatedPositions].map(([nodeId, position]) => [
          nodeId,
          { x: position.x, y: position.y + alignmentDeltaY },
        ]),
      )
      : translatedPositions;
    const movingNodesById = new Map(
      nodes
        .filter((node) => movingIds.has(node.id))
        .map((node) => [node.id, node]),
    );
    movingNodesById.set(draggedNode.id, draggedNode);
    const stationaryNodes = nodes.filter((node) => !movingIds.has(node.id));
    const proposedMovingNodes = [...movingNodesById].flatMap(([nodeId, movingNode]) => {
      const movingPosition = proposedTargetPositions.get(nodeId);
      return movingPosition ? [{ node: movingNode, position: movingPosition }] : [];
    });
    const hasStationaryNodeCollision = proposedMovingNodes.some(({ node, position }) => {
      const movingBounds = getNodeCollisionBounds(node, position);
      return stationaryNodes.some((stationaryNode) => (
        boundsOverlap(
          movingBounds,
          getNodeCollisionBounds(stationaryNode, stationaryNode.position),
        )
      ));
    });
    const hasMovingNodeCollision = proposedMovingNodes.some((movingNode, index) => {
      const movingBounds = getNodeCollisionBounds(movingNode.node, movingNode.position);
      return proposedMovingNodes.slice(index + 1).some((otherNode) => (
        boundsOverlap(
          movingBounds,
          getNodeCollisionBounds(otherNode.node, otherNode.position),
        )
      ));
    });
    const hasNodeCollision = hasStationaryNodeCollision || hasMovingNodeCollision;
    const targetPositions = hasCrossedParentBoundary || hasNodeCollision
      ? originalPositions
      : proposedTargetPositions;
    const animationStartedAt = performance.now();

    const animateAlignment = (now: number) => {
      const progress = Math.min((now - animationStartedAt) / ALIGNMENT_SNAP_DURATION, 1);
      const easedProgress = 1 - (1 - progress) ** 3;

      setNodes((currentNodes) => currentNodes.map((node) => {
        const startPosition = startPositions.get(node.id);
        const targetPosition = targetPositions.get(node.id);
        if (!startPosition || !targetPosition) return node;
        return {
          ...node,
          position: {
            x: startPosition.x + (targetPosition.x - startPosition.x) * easedProgress,
            y: startPosition.y + (targetPosition.y - startPosition.y) * easedProgress,
          },
        };
      }));

      if (progress < 1) {
        snapAnimationFrame.current = requestAnimationFrame(animateAlignment);
      } else {
        snapAnimationFrame.current = null;
      }
    };

    snapAnimationFrame.current = requestAnimationFrame(animateAlignment);
  };

  useEffect(() => () => {
    if (followAnimationFrame.current !== null) {
      cancelAnimationFrame(followAnimationFrame.current);
    }
    if (snapAnimationFrame.current !== null) {
      cancelAnimationFrame(snapAnimationFrame.current);
    }
  }, []);

  useEffect(() => {
    setIsSubmittingClarification(false);
    setClarificationError(null);
  }, [clarification?.requestKey]);

  useEffect(() => {
    setIsSubmittingApproval(false);
    setApprovalError(null);
  }, [approval?.requestKey]);

  useEffect(() => {
    setIsSubmittingAnalysisReview(false);
    setAnalysisReviewError(null);
  }, [analysisReview?.requestKey]);

  useEffect(() => {
    if (isolated) return;
    const isRestoringStoredRun = Boolean(
      activeRunId
      && locallyStartedRunId !== activeRunId
      && !run
      && visibleEvents.length === 0,
    );
    if (isRestoringStoredRun) return;

    const activeRunOriginalQuery = run?.run_id === activeRunId
      && typeof run.metadata?.query === 'string'
      ? run.metadata.query.trim()
      : '';
    const nextGraph = deriveNodeGraphFromEvents(
      visibleEvents,
      playgroundNodes,
      playgroundEdges,
      isRunActive ? activeRunId : null,
    );
    const explicitlyRemovedEventNodeIds = getExplicitlyRemovedEventNodeIds(visibleEvents);
    const terminalRunIds = new Set(
      visibleEvents
        .filter((event) => (
          ['run.completed', 'run.failed', 'run.cancelled'].includes(event.event_type)
        ))
        .map((event) => event.run_id),
    );
    const removedVisualNodeIds = new Set(explicitlyRemovedEventNodeIds);
    for (const node of nodes) {
      if (
        node.data.agentName === 'supervisor'
        && node.data.runId
        && terminalRunIds.has(node.data.runId)
      ) {
        removedVisualNodeIds.add(node.id);
      }
    }
    const eventTargetNodeIds = new Set(nextGraph.edges.map((edge) => edge.target));
    const rootEventNodes = nextGraph.nodes.filter((node) => !eventTargetNodeIds.has(node.id));
    const datasourceIdByRootNodeId = new Map(
      currentSessionId
        ? rootEventNodes.map((node) => [
            node.id,
            node.data.parentNodeId?.startsWith('datasource:')
              ? node.data.parentNodeId
              : `datasource:${node.data.runId ?? node.id}`,
          ] as const)
        : [],
    );
    const datasourceEdges: Edge[] = rootEventNodes.flatMap((node) => {
      const datasourceId = datasourceIdByRootNodeId.get(node.id);
      return datasourceId ? [{
        id: `${datasourceId}-to-${node.id}`,
        source: datasourceId,
        target: node.id,
        type: 'playground',
        selectable: false,
        animated: false,
        zIndex: 0,
        data: { flowState: 'idle' },
      }] : [];
    });
    const shouldAnimateNewEdges = hasReconciledEventGraph.current;
    setNodes((currentNodes) => {
      const manualNodes = currentNodes.filter((node) => node.id.startsWith('manual-'));
      const currentNodesById = new Map(currentNodes.map((node) => [node.id, node]));
      const positionedNodesById = new Map(currentNodesById);
      const queryByRunId = new Map<string, { label: string; text: string }>();
      const firstNodeIdByRunId = new Map<string, string>();
      const firstAgentNodeIdByRunId = new Map<string, string>();

      for (const node of [...currentNodes, ...nextGraph.nodes]) {
        const runId = node.data.runId;
        if (!runId) continue;

        if (!firstNodeIdByRunId.has(runId)) {
          firstNodeIdByRunId.set(runId, node.id);
        }
        if (node.data.agentName !== 'supervisor' && !firstAgentNodeIdByRunId.has(runId)) {
          firstAgentNodeIdByRunId.set(runId, node.id);
        }
        if (node.data.queryLabel && node.data.queryText && !queryByRunId.has(runId)) {
          queryByRunId.set(runId, {
            label: node.data.queryLabel,
            text: node.data.queryText,
          });
        }
      }

      if (activeRunId && activeRunOriginalQuery) {
        const runIdByNodeId = new Map(
          nextGraph.nodes
            .filter((node) => Boolean(node.data.runId))
            .map((node) => [node.id, node.data.runId!] as const),
        );
        const parentRunIdByRunId = new Map<string, string>();
        for (const edge of nextGraph.edges) {
          const parentRunId = runIdByNodeId.get(edge.source);
          const childRunId = runIdByNodeId.get(edge.target);
          if (parentRunId && childRunId && parentRunId !== childRunId) {
            parentRunIdByRunId.set(childRunId, parentRunId);
          }
        }

        let rootRunId = activeRunId;
        const visitedRunIds = new Set<string>();
        while (parentRunIdByRunId.has(rootRunId) && !visitedRunIds.has(rootRunId)) {
          visitedRunIds.add(rootRunId);
          rootRunId = parentRunIdByRunId.get(rootRunId)!;
        }
        if (!queryByRunId.has(rootRunId)) {
          queryByRunId.set(rootRunId, {
            label: '원본 쿼리',
            text: activeRunOriginalQuery,
          });
        }
      }

      const eventNodes = nextGraph.nodes.map((node) => {
        const currentNode = currentNodesById.get(node.id);
        const runId = node.data.runId;
        const queryTargetNodeId = runId
          ? firstAgentNodeIdByRunId.get(runId) ?? firstNodeIdByRunId.get(runId)
          : null;
        const inheritedQuery = runId && queryTargetNodeId === node.id
          ? queryByRunId.get(runId)
          : null;
        const data = {
          ...node.data,
          parentNodeId: datasourceIdByRootNodeId.get(node.id) ?? node.data.parentNodeId,
          queryLabel: node.data.queryLabel ?? inheritedQuery?.label,
          queryText: node.data.queryText ?? inheritedQuery?.text,
          animateOnCreate: !currentNode && shouldAnimateNewEdges,
          onDeleteRun: handleDeleteRunStable,
        };
        const parentNode = data.parentNodeId
          ? positionedNodesById.get(data.parentNodeId)
          : null;
        const preferredPosition = currentNode?.position ?? {
          ...node.position,
          x: parentNode
            ? Math.max(node.position.x, parentNode.position.x + NODE_CREATION_X_GAP)
            : node.position.x,
          y: parentNode && parentNode.data.runId === data.runId
            ? parentNode.position.y
            : node.position.y,
        };
        let positionedNode = {
          ...node,
          position: preferredPosition,
          data,
        };
        if (!currentNode) {
          const occupiedNodes = [...positionedNodesById.values()];
          const datasourceId = datasourceIdByRootNodeId.get(node.id);
          const position = datasourceId
            ? findNonOverlappingFlowStartPosition(
              positionedNode,
              createDatasourceNode(
                datasourceId,
                currentSession,
                {
                  x: preferredPosition.x - NODE_CREATION_X_GAP,
                  y: preferredPosition.y,
                },
              ),
              preferredPosition,
              occupiedNodes,
            )
            : findNonOverlappingPosition(positionedNode, preferredPosition, occupiedNodes);
          positionedNode = { ...positionedNode, position };
        }
        positionedNodesById.set(node.id, positionedNode);
        return positionedNode;
      });

      const eventNodeById = new Map(eventNodes.map((node) => [node.id, node]));
      const latestNodeIdByRunId = new Map<string, string>();

      for (const node of eventNodes) {
        const runId = node.data.runId;
        if (!runId) continue;
        if (node.data.queryLabel && node.data.queryText && !queryByRunId.has(runId)) {
          queryByRunId.set(runId, {
            label: node.data.queryLabel,
            text: node.data.queryText,
          });
        }
        const latestNodeId = latestNodeIdByRunId.get(runId);
        const latestNode = latestNodeId ? eventNodeById.get(latestNodeId) : null;
        if (!latestNode || (node.data.nodeSequence ?? 0) >= (latestNode.data.nodeSequence ?? 0)) {
          latestNodeIdByRunId.set(runId, node.id);
        }
      }

      const branchBadgesByParentId = new Map<string, PlaygroundNodeQuery[]>();
      for (const edge of nextGraph.edges) {
        const parentNode = eventNodeById.get(edge.source);
        const branchNode = eventNodeById.get(edge.target);
        const branchRunId = branchNode?.data.runId;
        if (!parentNode || !branchNode || !branchRunId || parentNode.data.runId === branchRunId) {
          continue;
        }

        const branchQuery = queryByRunId.get(branchRunId);
        if (!branchQuery) continue;
        const badges = branchBadgesByParentId.get(parentNode.id) ?? [];
        badges.push({
          ...branchQuery,
          flowNodeId: latestNodeIdByRunId.get(branchRunId) ?? branchNode.id,
        });
        branchBadgesByParentId.set(parentNode.id, badges);
      }

      const eventNodesWithQueryBadges = eventNodes.map((node) => {
        const runId = node.data.runId;
        const ownQuery = runId ? queryByRunId.get(runId) : null;
        const queryBadges = [
          ...(ownQuery ? [{
            ...ownQuery,
            flowNodeId: latestNodeIdByRunId.get(runId!) ?? node.id,
          }] : []),
          ...(branchBadgesByParentId.get(node.id) ?? []),
        ].filter((query, index, all) => (
          all.findIndex((candidate) => (
            candidate.label === query.label
            && candidate.text === query.text
            && candidate.flowNodeId === query.flowNodeId
          )) === index
        ));

        return {
          ...node,
          data: {
            ...node.data,
            queryBadges,
            onFlowHover: setHoveredFlowNodeId,
          },
        };
      });

      const rootNodeByDatasourceId = new Map<string, Node<PlaygroundNodeData>>();
      for (const node of eventNodesWithQueryBadges) {
        const datasourceId = datasourceIdByRootNodeId.get(node.id);
        if (datasourceId && !rootNodeByDatasourceId.has(datasourceId)) {
          rootNodeByDatasourceId.set(datasourceId, node);
        }
      }
      const datasourceNodes = [...rootNodeByDatasourceId].map(
        ([datasourceId, rootNode]) => {

          const currentDatasourceNode = currentNodesById.get(datasourceId);
          const defaultPosition = {
            x: rootNode.position.x - NODE_CREATION_X_GAP,
            y: rootNode.position.y,
          };
          const datasourceNode = createDatasourceNode(
            datasourceId,
            currentSession,
            defaultPosition,
            !currentDatasourceNode && shouldAnimateNewEdges,
          );
          const occupiedNodes = [
            ...currentNodes,
            ...eventNodesWithQueryBadges,
          ];
          const canKeepCurrentPosition = Boolean(
            currentDatasourceNode
            && !overlapsAnyNode(
              datasourceNode,
              currentDatasourceNode.position,
              occupiedNodes,
            ),
          );
          const preferredPosition = currentDatasourceNode && canKeepCurrentPosition
            ? currentDatasourceNode.position
            : defaultPosition;
          const position = findNonOverlappingPosition(
            datasourceNode,
            preferredPosition,
            occupiedNodes,
          );
          return { ...datasourceNode, position };
        },
      );
      const nextNodeIds = new Set(eventNodesWithQueryBadges.map((node) => node.id));
      const retainedEventNodes = currentNodes.filter((node) => (
        node.data.kind !== 'datasource'
        && !node.id.startsWith('manual-')
        && !nextNodeIds.has(node.id)
        && !removedVisualNodeIds.has(node.id)
      ));
      const generatedDatasourceIds = new Set(datasourceNodes.map((node) => node.id));
      const retainedDatasourceNodes = currentNodes.filter((node) => (
        node.data.kind === 'datasource'
        && !generatedDatasourceIds.has(node.id)
      ));

      return [
        ...datasourceNodes,
        ...retainedDatasourceNodes,
        ...eventNodesWithQueryBadges,
        ...retainedEventNodes,
        ...manualNodes,
      ];
    });
    setEdges((currentEdges) => {
      const currentEdgesById = new Map(currentEdges.map((edge) => [edge.id, edge]));
      const manualEdges = currentEdges.filter((edge) => edge.id.startsWith('manual-edge-'));
      const eventEdges = [...nextGraph.edges, ...datasourceEdges].map((edge) => {
        const currentEdge = currentEdgesById.get(edge.id);
        if (!currentEdge) {
          return {
            ...edge,
            data: {
              ...edge.data,
              // Restored history is already complete; only subsequently added edges draw in.
              animateOnCreate: shouldAnimateNewEdges,
            },
          };
        }

        const data = {
          ...currentEdge.data,
          ...edge.data,
          animateOnCreate: false,
        };
        return {
          ...edge,
          data,
          zIndex: 0,
        };
      });
      const nextEventEdgeIds = new Set(eventEdges.map((edge) => edge.id));
      const retainedEventEdges = currentEdges.filter((edge) => (
        !edge.id.startsWith('manual-edge-')
        && !nextEventEdgeIds.has(edge.id)
        && !removedVisualNodeIds.has(edge.source)
        && !removedVisualNodeIds.has(edge.target)
      ));

      return [...eventEdges, ...retainedEventEdges, ...manualEdges];
    });
    hasReconciledEventGraph.current = true;

    for (const node of nextGraph.nodes) {
      if (node.data.status !== 'success' || !node.data.runId) continue;
      const hydrationKey = `${node.data.runId}:${node.id}`;
      if (hydratedSummaryNodes.current.has(hydrationKey)) continue;
      hydratedSummaryNodes.current.add(hydrationKey);
      void getAgentNodeSummary(node.data.runId, node.id)
        .then((response) => {
          setNodes((currentNodes) => currentNodes.map((currentNode) => (
            currentNode.id === node.id
              ? {
                  ...currentNode,
                  data: { ...currentNode.data, description: response.summary.key_finding },
                }
              : currentNode
          )));
        })
        .catch(() => {
          hydratedSummaryNodes.current.delete(hydrationKey);
        });
    }
  }, [
    activeRunId,
    currentSession,
    currentSessionId,
    handleDeleteRunStable,
    isolated,
    isRunActive,
    locallyStartedRunId,
    run,
    visibleEvents,
    setEdges,
    setNodes,
  ]);

  const nodeActivationKey = nodes
    .map((node) => `${node.id}:${node.data.status}:${node.selected ? 'selected' : 'idle'}`)
    .join('|');
  const edgeTopologyKey = edges
    .map((edge) => `${edge.id}:${edge.source}:${edge.target}`)
    .join('|');

  useEffect(() => {
    const persistentTargetNodeIds = activeFlowTarget?.nodeId
      ? nodes.some((node) => node.id === activeFlowTarget.nodeId)
        ? [activeFlowTarget.nodeId]
        : []
      : activeFlowTarget?.runId
        ? (() => {
          const flowNodes = nodes.filter((node) => node.data.runId === activeFlowTarget.runId);
          const latestFlowNode = flowNodes.reduce<Node<PlaygroundNodeData> | null>(
            (latest, node) => (
              !latest || (node.data.nodeSequence ?? 0) >= (latest.data.nodeSequence ?? 0)
                ? node
                : latest
            ),
            null,
          );
          return latestFlowNode ? [latestFlowNode.id] : [];
        })()
      : nodes.filter((node) => node.selected).map((node) => node.id);

    // A query badge previews another flow without replacing the user's active flow.
    const targetNodeIds = hoveredFlowNodeId && nodes.some((node) => node.id === hoveredFlowNodeId)
      ? [...new Set([...persistentTargetNodeIds, hoveredFlowNodeId])]
      : persistentTargetNodeIds;

    setEdges((currentEdges) => {
      const activeEdgeIds = getAncestorEdgeIds(currentEdges, targetNodeIds);
      let changed = false;
      const nextEdges = currentEdges.map((edge) => {
        const shouldBeActive = activeEdgeIds.has(edge.id);
        const isActive = edge.data?.flowState === 'active';
        if (shouldBeActive === isActive) return edge;
        changed = true;
        return {
          ...edge,
          zIndex: 0,
          data: {
            ...edge.data,
            flowState: shouldBeActive ? 'active' : 'idle',
          },
        };
      });
      return changed ? nextEdges : currentEdges;
    });
  }, [activeFlowTarget, edgeTopologyKey, hoveredFlowNodeId, nodeActivationKey, nodes, setEdges]);

  useEffect(() => {
    setSelectedNodeSummary((selected) => {
      if (!selected) return null;
      const currentNode = nodes.find((node) => node.id === selected.id);
      if (!currentNode || currentNode.data.status === selected.status) return selected;
      return {
        ...selected,
        runId: currentNode.data.runId ?? selected.runId,
        label: currentNode.data.label,
        kind: currentNode.data.kind,
        status: currentNode.data.status,
        parentNodeId: currentNode.data.parentNodeId ?? null,
      };
    });
  }, [nodes]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedNodeSummary) {
      setNodeSummaryRequest({ data: null, error: null, isLoading: false });
      return () => { cancelled = true; };
    }
    if (!selectedNodeSummary.runId || selectedNodeSummary.status !== 'success') {
      setNodeSummaryRequest({ data: null, error: null, isLoading: false });
      return () => { cancelled = true; };
    }

    setNodeSummaryRequest({ data: null, error: null, isLoading: true });
    getAgentNodeSummary(selectedNodeSummary.runId, selectedNodeSummary.id)
      .then((response) => {
        if (!cancelled) {
          setNodeSummaryRequest({ data: response.summary, error: null, isLoading: false });
          setNodes((currentNodes) => currentNodes.map((node) => (
            node.id === selectedNodeSummary.id
              ? { ...node, data: { ...node.data, description: response.summary.key_finding } }
              : node
          )));
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof BackendApiError
          ? error.message
          : '노드 서머리를 불러오지 못했습니다.';
        setNodeSummaryRequest({ data: null, error: message, isLoading: false });
      });

    return () => { cancelled = true; };
  }, [selectedNodeSummary]);

  useEffect(() => {
    reportRequestSequence.current += 1;
    setNodeReportRequest({ data: null, error: null, isLoading: false });
    if (mode === 'report') setSelectedNodeSummary(null);
  }, [mode]);

  const handlePromptSend = async (prompt: string) => {
    if (isGenerating || isolated) return;

    const sessionId = getCurrentSessionId();
    if (!sessionId) {
      console.error('선택된 세션이 없습니다.');
      return;
    }

    setIsStartingRun(true);
    setCancelRunError(null);
    setSelectedNodeSummary(null);

    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    const viewportCenter = canvasBounds && reactFlowInstanceRef.current
      ? reactFlowInstanceRef.current.screenToFlowPosition({
          x: canvasBounds.left + canvasBounds.width / 2,
          y: canvasBounds.top + canvasBounds.height / 2,
        })
      : { x: 0, y: 120 };
    const preferredInitialNodePosition = getNewPromptNodePosition(nodes, viewportCenter);

    try {
      const run = await createAgentRun(sessionId, prompt);
      const initialNodeId = `${run.run_id}:node:1`;
      const datasourceNodeId = `datasource:${run.run_id}`;
      const initialNode: Node<PlaygroundNodeData> = {
        id: initialNodeId,
        type: 'playground',
        position: preferredInitialNodePosition,
        data: {
          label: 'Agent 선택 중',
          description: '분석 계획과 현재 근거를 검토하고 있습니다.',
          kind: 'supervisor',
          status: 'selecting',
          eventType: 'supervisor.selection.started',
          lastMessage: '다음 Agent를 선택하고 있습니다.',
          runId: run.run_id,
          nodeSequence: 1,
          parentNodeId: null,
          agentName: 'supervisor',
          queryLabel: '원본 쿼리',
          queryText: prompt,
          animateOnCreate: true,
        },
      };
      const datasourceNode = createDatasourceNode(
        datasourceNodeId,
        currentSession,
        {
          x: preferredInitialNodePosition.x - NODE_CREATION_X_GAP,
          y: preferredInitialNodePosition.y,
        },
        true,
      );
      const initialNodePosition = findNonOverlappingFlowStartPosition(
        initialNode,
        datasourceNode,
        preferredInitialNodePosition,
        nodes,
      );
      const datasourcePosition = {
        x: initialNodePosition.x - NODE_CREATION_X_GAP,
        y: initialNodePosition.y,
      };
      setNodes((currentNodes) => [
        ...currentNodes.filter(
          (node) => node.id !== initialNodeId && node.id !== datasourceNodeId,
        ),
        createDatasourceNode(datasourceNodeId, currentSession, datasourcePosition, true),
        {
          ...initialNode,
          position: initialNodePosition,
        },
      ]);
      setEdges((currentEdges) => [
        ...currentEdges.filter(
          (edge) => edge.source !== datasourceNodeId && edge.target !== initialNodeId,
        ),
        {
          id: `${datasourceNodeId}-to-${initialNodeId}`,
          source: datasourceNodeId,
          target: initialNodeId,
          type: 'playground',
          selectable: false,
          animated: false,
          zIndex: 0,
          data: { flowState: 'active', animateOnCreate: true },
        },
      ]);
      setActiveRunId(run.run_id);
      setLocallyStartedRunId(run.run_id);
      setStoredActiveRunId(run.run_id);
      setActiveFlowTarget({ nodeId: null, runId: run.run_id });

      const instance = reactFlowInstanceRef.current;
      if (instance) {
        const { zoom } = instance.getViewport();
        void instance.setCenter(
          initialNodePosition.x + INITIAL_NODE_WIDTH / 2,
          initialNodePosition.y + INITIAL_NODE_HEIGHT / 2,
          { zoom, duration: 520 },
        );
      }
    } catch (error) {
      console.error('Agent run failed:', error);
    } finally {
      setIsStartingRun(false);
    }
  };

  const handleStopRun = async () => {
    if (!activeRunId || !isRunActive || isCancellingRun) return;

    setIsCancellingRun(true);
    setCancelRunError(null);
    try {
      await cancelAgentRun(activeRunId);
      const cancelledRunEvents = await listAgentRunRelatedEvents(activeRunId)
        .catch(() => null);
      if (cancelledRunEvents) {
        setVisibleEvents((currentEvents) => (
          mergeRunEvents(currentEvents, cancelledRunEvents)
        ));
      }
      reconnectRunStream();
    } catch (error) {
      const message = error instanceof BackendApiError
        ? error.message
        : '실행을 정지하지 못했습니다. 다시 시도해 주세요.';
      setCancelRunError(message);
    } finally {
      setIsCancellingRun(false);
    }
  };

  const handleClarificationSend = async (answer: string) => {
    if (!activeRunId || !clarification || isSubmittingClarification) return;

    setIsSubmittingClarification(true);
    setClarificationError(null);
    try {
      await resumeAgentRun(activeRunId, answer);
      setDismissedClarificationKey(clarification.requestKey);
      setLocallyStartedRunId(activeRunId);
      reconnectRunStream();
      setIsSubmittingClarification(false);
    } catch (error) {
      const message = error instanceof BackendApiError
        ? error.message
        : '답변을 전송하지 못했습니다. 다시 시도해 주세요.';
      setClarificationError(message);
      setIsSubmittingClarification(false);
      throw error;
    }
  };

  const handleApprovalDecision = async (approved: boolean) => {
    if (!activeRunId || !approval || isSubmittingApproval) return;

    setIsSubmittingApproval(true);
    setApprovalError(null);
    try {
      await resumeAgentRunApproval(activeRunId, approved);
      setDismissedApprovalKey(approval.requestKey);
      setLocallyStartedRunId(activeRunId);
      reconnectRunStream();
      setIsSubmittingApproval(false);
    } catch (error) {
      const message = error instanceof BackendApiError
        ? error.message
        : '승인 처리를 전송하지 못했습니다. 다시 시도해 주세요.';
      setApprovalError(message);
      setIsSubmittingApproval(false);
      throw error;
    }
  };

  const handleAnalysisReviewDecision = async (
    selection: { selectedOptionId?: string; freeText?: string },
  ) => {
    if (!activeRunId || !analysisReview || isSubmittingAnalysisReview) return;

    setIsSubmittingAnalysisReview(true);
    setAnalysisReviewError(null);
    try {
      await resumeAgentRunAnalysisReview(
        activeRunId,
        analysisReview.approvalId,
        selection,
      );
      setDismissedAnalysisReviewKey(analysisReview.requestKey);
      setLocallyStartedRunId(activeRunId);
      reconnectRunStream();
      setIsSubmittingAnalysisReview(false);
    } catch (error) {
      const message = error instanceof BackendApiError
        ? error.message
        : '분석 검토 응답을 전송하지 못했습니다. 다시 시도해 주세요.';
      setAnalysisReviewError(message);
      setIsSubmittingAnalysisReview(false);
      throw error;
    }
  };

  const handleCreateNode = (kind: CreatableNodeKind) => {
    const selectedNode = nodes.find((node) => node.selected);
    const nodeId = `manual-${crypto.randomUUID()}`;
    const existingChildCount = selectedNode
      ? edges.filter((edge) => edge.source === selectedNode.id).length
      : 0;

    setNodes((currentNodes) => {
      const manualNodeCount = currentNodes.filter((node) => node.id.startsWith('manual-')).length;
      const column = manualNodeCount % 3;
      const row = Math.floor(manualNodeCount / 3);
      const preferredPosition = selectedNode
        ? {
            x: selectedNode.position.x + NODE_CREATION_X_GAP,
            y: selectedNode.position.y
              + (existingChildCount > 0 ? existingChildCount * NODE_CREATION_BRANCH_Y_GAP : 0),
          }
        : { x: 280 + column * 384, y: 320 + row * 200 };
      const newNode: Node<PlaygroundNodeData> = {
        id: nodeId,
        type: 'playground',
        position: preferredPosition,
        selected: true,
        data: {
          ...NODE_DEFAULTS[kind],
          kind,
          status: 'idle',
          parentNodeId: selectedNode?.id ?? null,
          animateOnCreate: true,
        },
      };
      const nextPosition = findNonOverlappingPosition(
        newNode,
        preferredPosition,
        currentNodes,
      );

      return [
        ...currentNodes.map((node) => (
          node.selected ? { ...node, selected: false } : node
        )),
        {
          ...newNode,
          position: nextPosition,
        },
      ];
    });

    if (selectedNode) {
      setEdges((currentEdges) => [
        ...currentEdges,
        {
          id: `manual-edge-${crypto.randomUUID()}`,
          source: selectedNode.id,
          target: nodeId,
          type: 'playground',
          selectable: false,
        },
      ]);
    }
  };

  const handleNodeClick = (_event: ReactMouseEvent, node: Node<PlaygroundNodeData>) => {
    if (node.data.status === 'selecting' || node.data.kind === 'datasource') return;

    setActiveFlowTarget({ nodeId: node.id, runId: node.data.runId ?? null });
    if (isolated) {
      setSelectedNodeSummary(null);
      return;
    }

    if (mode === 'report') {
      setSelectedNodeSummary(null);
      if (node.data.kind !== 'insight-agent' || node.data.status !== 'success' || !node.data.runId) {
        setNodeReportRequest({
          data: null,
          error: '완료된 Insight 노드를 선택해 주세요.',
          isLoading: false,
        });
        return;
      }

      const requestSequence = reportRequestSequence.current + 1;
      reportRequestSequence.current = requestSequence;
      setNodeReportRequest({ data: null, error: null, isLoading: true });
      void createAgentNodeReport(node.data.runId, node.id)
        .then((response) => {
          if (reportRequestSequence.current !== requestSequence) return;
          setNodeReportRequest({ data: response, error: null, isLoading: false });
          notifyReportsUpdated();
        })
        .catch((error: unknown) => {
          if (reportRequestSequence.current !== requestSequence) return;
          const message = error instanceof BackendApiError
            ? error.message
            : '리포트를 생성하지 못했습니다.';
          setNodeReportRequest({ data: null, error: message, isLoading: false });
        });
      return;
    }

    setNodeReportRequest({ data: null, error: null, isLoading: false });
    setSelectedNodeSummary({
      id: node.id,
      runId: node.data.runId ?? activeRunId,
      label: node.data.label,
      kind: node.data.kind,
      status: node.data.status,
      parentNodeId: node.data.parentNodeId ?? null,
    });
  };

  const handleBranchPromptSend = async (prompt: string) => {
    const branchSourceRunId = selectedNodeSummary?.runId ?? activeRunId;
    if (!branchSourceRunId || !selectedNodeSummary || isGenerating) return;
    const startStage = BRANCH_STAGE_BY_NODE_KIND[selectedNodeSummary.kind];
    if (!startStage) {
      throw new Error('이 노드에서는 분기를 시작할 수 없습니다.');
    }

    setIsStartingRun(true);
    try {
      const branchRun = await branchAgentRun(
        branchSourceRunId,
        startStage,
        prompt,
        selectedNodeSummary.parentNodeId,
      );
      setActiveRunId(branchRun.run_id);
      setLocallyStartedRunId(branchRun.run_id);
      setStoredActiveRunId(branchRun.run_id);
      setActiveFlowTarget({ nodeId: null, runId: branchRun.run_id });
      setSelectedNodeSummary(null);
    } catch (error) {
      console.error('Branch run failed:', error);
      throw error;
    } finally {
      setIsStartingRun(false);
    }
  };

  const handleDeleteAllNodes = async () => {
    if (isGenerating || isDeletingNodes || !hasDeletableNodes) return;
    if (isolated) {
      const confirmed = window.confirm('테스트 페이지의 모든 임시 노드를 지울까요?');
      if (!confirmed) return;
      setNodes([]);
      setEdges([]);
      setActiveFlowTarget(null);
      setSelectedNodeSummary(null);
      return;
    }
    const confirmed = window.confirm(
      '현재 실행의 모든 노드와 서머리 데이터를 영구적으로 삭제할까요?',
    );
    if (!confirmed) return;

    setIsDeletingNodes(true);
    setDeleteNodesError(null);
    try {
      const sessionId = getCurrentSessionId();
      if (sessionId) {
        await deleteAgentSessionRuns(sessionId);
      } else if (activeRunId) {
        await deleteAgentRun(activeRunId);
      }
      clearStoredActiveRunId();
      clearStoredPlaygroundGraph();
      setActiveRunId(null);
      setLocallyStartedRunId(null);
      setActiveFlowTarget(null);
      setVisibleEvents([]);
      setSelectedNodeSummary(null);
      setNodeReportRequest({ data: null, error: null, isLoading: false });
      setNodes(initialGraph.nodes);
      setEdges(initialGraph.edges);
    } catch (error) {
      const message = error instanceof BackendApiError
        ? error.message
        : '노드 데이터를 삭제하지 못했습니다.';
      setDeleteNodesError(message);
    } finally {
      setIsDeletingNodes(false);
    }
  };

  const handlePaneClick = () => {
    setSelectedNodeSummary(null);
    reportRequestSequence.current += 1;
    setNodeReportRequest({ data: null, error: null, isLoading: false });
    collapse();
  };

  return (
    <div
      ref={canvasRef}
      className={`${styles.canvas} ${
        isLeavingForSessions ? styles.canvasLeavingForSessions : ''
      } ${isEnteringFromSessions ? styles.canvasEnteringFromSessions : ''}`}
    >
      {!isSessionView ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance;
          }}
          selectNodesOnDrag={false}
          fitView
        >
        </ReactFlow>
      ) : null}

      <PlaygroundOverlay
        isGenerating={isGenerating}
        canStop={isRunActive && !isStartingRun}
        isStopping={isCancellingRun}
        stopError={cancelRunError}
        onStop={handleStopRun}
        onPromptSend={handlePromptSend}
        clarification={clarification}
        analysisReview={analysisReview}
        isSubmittingAnalysisReview={isSubmittingAnalysisReview}
        analysisReviewError={analysisReviewError}
        onAnalysisReviewDecision={handleAnalysisReviewDecision}
        isSubmittingClarification={isSubmittingClarification}
        clarificationError={clarificationError}
        onClarificationSend={handleClarificationSend}
        approval={approval}
        isSubmittingApproval={isSubmittingApproval}
        approvalError={approvalError}
        onApprovalDecision={handleApprovalDecision}
        nodeSummary={selectedNodeSummary}
        nodeSummaryData={nodeSummaryRequest.data}
        nodeSummaryRunId={selectedNodeSummary?.runId ?? activeRunId}
        nodeSummaryError={nodeSummaryRequest.error}
        isNodeSummaryLoading={nodeSummaryRequest.isLoading}
        onCloseNodeSummary={() => setSelectedNodeSummary(null)}
        generatedReport={nodeReportRequest.data}
        generatedReportError={nodeReportRequest.error}
        isGeneratingReport={nodeReportRequest.isLoading}
        onCloseGeneratedReport={() => {
          reportRequestSequence.current += 1;
          setNodeReportRequest({ data: null, error: null, isLoading: false });
        }}
        onBranchPromptSend={handleBranchPromptSend}
        canDeleteAllNodes={hasDeletableNodes && !isGenerating && !isDeletingNodes}
        isDeletingAllNodes={isDeletingNodes}
        deleteAllNodesError={deleteNodesError}
        onDeleteAllNodes={handleDeleteAllNodes}
        preview={preview}
        onClosePreview={onClosePreview}
        onCreateNode={handleCreateNode}
        isLeavingForSessions={isLeavingForSessions}
        isEnteringFromSessions={isEnteringFromSessions}
        reportsOverride={reportsOverride}
      />
    </div>
  );
}
