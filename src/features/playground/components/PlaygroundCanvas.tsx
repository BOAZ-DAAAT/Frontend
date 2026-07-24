import {
  ReactFlow,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeChange,
  type OnNodeDrag,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

import '@xyflow/react/dist/style.css';

import {
  branchAgentRun,
  cancelAgentRun,
  createAgentRun,
  deleteAgentRun,
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
import type { PlaygroundNodeData } from '@/features/playground/types';
import type { RunEvent, RunSummary } from '@/features/runs/types';
import { getCurrentSessionId } from '@/features/session/currentSession';
import { BackendApiError } from '@/lib/apiClient';

import { PlaygroundOverlay } from './PlaygroundOverlay';
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

export function PlaygroundCanvas({
  preview,
  onClosePreview,
  isLeavingForSessions,
  isEnteringFromSessions,
}: PlaygroundCanvasProps) {
  const initialGraph = useMemo(
    () => deriveNodeGraphFromEvents([], playgroundNodes, playgroundEdges),
    [],
  );
  const initialStoredGraph = useMemo(
    () => getStoredPlaygroundGraph(initialGraph.nodes, initialGraph.edges),
    [initialGraph.edges, initialGraph.nodes],
  );
  const [nodes, setNodes] = useNodesState(initialStoredGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialStoredGraph.edges);
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
  const draggedNodeId = useRef<string | null>(null);
  const dragStartPositions = useRef(new Map<string, { x: number; y: number }>());
  const followTargets = useRef(new Map<string, { x: number; y: number }>());
  const followDepths = useRef(new Map<string, number>());
  const followAnimationFrame = useRef<number | null>(null);
  const snapAnimationFrame = useRef<number | null>(null);

  const [activeRunId, setActiveRunId] = useState<string | null>(() => getStoredActiveRunId());
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
  const { run, events, error: runStreamError } = useAgentRunStream(activeRunId);
  const [visibleEvents, setVisibleEvents] = useState<RunEvent[]>([]);

  const handleDeleteRunStable = useCallback(async (runId: string, label: string) => {
    const shouldDelete = window.confirm(
      `${label} 노드가 속한 분기 run 전체를 삭제할까요?\n\nrun_id: ${runId}`,
    );
    if (!shouldDelete) return;

    try {
      await deleteAgentRun(runId);
      const fallbackRunId = visibleEvents.find((event) => event.run_id !== runId)?.run_id ?? null;
      setVisibleEvents((currentEvents) => currentEvents.filter((event) => event.run_id !== runId));
      setSelectedNodeSummary((selected) => (
        selected?.runId === runId ? null : selected
      ));

      if (activeRunId === runId) {
        setActiveRunId(fallbackRunId);
        if (fallbackRunId) {
          setStoredActiveRunId(fallbackRunId);
        } else {
          clearStoredActiveRunId();
        }
      }
    } catch (error) {
      const message = error instanceof BackendApiError
        ? error.message
        : error instanceof Error
          ? error.message
        : 'run을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
      window.alert(message);
      throw error;
    }
  }, [activeRunId, visibleEvents]);

  useEffect(() => {
    setVisibleEvents((currentEvents) => mergeRunEvents(currentEvents, events));
  }, [events]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    setStoredPlaygroundGraph(nodes, edges);
  }, [edges, nodes]);

  useEffect(() => {
    // 새로고침으로 복원한 run_id가 더 이상 존재하지 않으면(삭제됨 등) 저장값을 비운다.
    if (runStreamError && !run) {
      clearStoredActiveRunId();
      setActiveRunId(null);
    }
  }, [runStreamError, run]);

  const { collapse, view } = useSidebar();
  const { mode } = useMode();
  const isSessionView = view === 'sessions';
  const isRunActive = Boolean(
    activeRunId && (
      !run
      || run.run_id !== activeRunId
      || !['succeeded', 'failed', 'cancelled'].includes(run.status)
    ),
  );
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
  const hasDeletableNodes = nodes.length > 0;

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

    const targetPositions = hasCrossedParentBoundary
      ? originalPositions
      : shouldAlignVertically
        ? new Map(
          [...translatedPositions].map(([nodeId, position]) => [
            nodeId,
            { x: position.x, y: position.y + alignmentDeltaY },
          ]),
        )
        : translatedPositions;
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
    const nextGraph = deriveNodeGraphFromEvents(
      visibleEvents,
      playgroundNodes,
      playgroundEdges,
      activeRunId,
    );
    setNodes((currentNodes) => {
      const manualNodes = currentNodes.filter((node) => node.id.startsWith('manual-'));
      const currentNodesById = new Map(currentNodes.map((node) => [node.id, node]));
      const positionedNodesById = new Map(currentNodesById);

      const eventNodes = nextGraph.nodes.map((node) => {
        const currentNode = currentNodesById.get(node.id);
        const data = { ...node.data, onDeleteRun: handleDeleteRunStable };
        const parentNode = data.parentNodeId
          ? positionedNodesById.get(data.parentNodeId)
          : null;
        const position = currentNode?.position ?? {
          ...node.position,
          x: parentNode
            ? Math.max(node.position.x, parentNode.position.x + NODE_CREATION_X_GAP)
            : node.position.x,
        };
        const positionedNode = {
          ...node,
          position,
          data,
        };
        positionedNodesById.set(node.id, positionedNode);
        return positionedNode;
      });

      return [...eventNodes, ...manualNodes];
    });
    setEdges((currentEdges) => {
      const currentEdgesById = new Map(currentEdges.map((edge) => [edge.id, edge]));
      const manualEdges = currentEdges.filter((edge) => edge.id.startsWith('manual-edge-'));
      const eventEdges = nextGraph.edges.map((edge) => {
        const currentEdge = currentEdgesById.get(edge.id);
        if (!currentEdge) return edge;

        const data = { ...currentEdge.data, ...edge.data };
        return {
          ...edge,
          data,
          zIndex: data.flowState === 'active' ? 10 : 0,
        };
      });

      return [...eventEdges, ...manualEdges];
    });

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
  }, [activeRunId, handleDeleteRunStable, visibleEvents, setEdges, setNodes]);

  const nodeActivationKey = nodes
    .map((node) => `${node.id}:${node.data.status}:${node.selected ? 'selected' : 'idle'}`)
    .join('|');
  const edgeTopologyKey = edges
    .map((edge) => `${edge.id}:${edge.source}:${edge.target}`)
    .join('|');

  useEffect(() => {
    const runningNodeIds = nodes
      .filter((node) => (
        node.data.status === 'selecting'
        || node.data.status === 'running'
        || node.data.status === 'waiting'
      ))
      .map((node) => node.id);
    const targetNodeIds = runningNodeIds.length > 0
      ? runningNodeIds
      : nodes.filter((node) => node.selected).map((node) => node.id);

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
          zIndex: shouldBeActive ? 10 : 0,
          data: {
            ...edge.data,
            flowState: shouldBeActive ? 'active' : 'idle',
          },
        };
      });
      return changed ? nextEdges : currentEdges;
    });
  }, [edgeTopologyKey, nodeActivationKey, nodes, setEdges]);

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
    if (isGenerating) return;

    const sessionId = getCurrentSessionId();
    if (!sessionId) {
      console.error('선택된 세션이 없습니다.');
      return;
    }

    setIsStartingRun(true);
    setCancelRunError(null);
    setActiveRunId(null);
    setSelectedNodeSummary(null);

    try {
      const run = await createAgentRun(sessionId, prompt);
      setActiveRunId(run.run_id);
      setStoredActiveRunId(run.run_id);
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
      const nextPosition = selectedNode
        ? {
            x: selectedNode.position.x + NODE_CREATION_X_GAP,
            y: selectedNode.position.y
              + (existingChildCount > 0 ? existingChildCount * NODE_CREATION_BRANCH_Y_GAP : 0),
          }
        : { x: 280 + column * 384, y: 320 + row * 200 };

      return [
        ...currentNodes.map((node) => (
          node.selected ? { ...node, selected: false } : node
        )),
        {
          id: nodeId,
          type: 'playground',
          position: nextPosition,
          selected: true,
          data: {
            ...NODE_DEFAULTS[kind],
            kind,
            status: 'idle',
            parentNodeId: selectedNode?.id ?? null,
          },
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
    if (node.data.status === 'selecting') return;

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
      setStoredActiveRunId(branchRun.run_id);
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
    const confirmed = window.confirm(
      '현재 실행의 모든 노드와 서머리 데이터를 영구적으로 삭제할까요?',
    );
    if (!confirmed) return;

    setIsDeletingNodes(true);
    setDeleteNodesError(null);
    try {
      if (activeRunId) await deleteAgentRun(activeRunId);
      clearStoredActiveRunId();
      clearStoredPlaygroundGraph();
      setActiveRunId(null);
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
      />
    </div>
  );
}
