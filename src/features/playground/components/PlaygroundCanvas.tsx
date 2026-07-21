import {
  ReactFlow,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

import '@xyflow/react/dist/style.css';

import {
  branchAgentRun,
  createAgentRun,
  deleteAgentRun,
  resumeAgentRun,
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
import { playgroundEdges, playgroundNodes } from '@/features/playground/mocks';
import type { CreatableNodeKind } from '@/features/playground/node-editor';
import { PlaygroundNode } from '@/features/playground/node/PlaygroundNode';
import { getAgentNodeSummary } from '@/features/playground/node-summary/api';
import type { NodeSummary } from '@/features/playground/node-summary/types';
import { deriveNodeGraphFromEvents } from '@/features/playground/runEventGraph';
import { useSidebar } from '@/features/playground/sidebar/SidebarContext';
import type { PlaygroundNodeData } from '@/features/playground/types';
import type { RunEvent, RunSummary } from '@/features/runs/types';
import { getCurrentSessionId } from '@/features/session/currentSession';
import { BackendApiError } from '@/lib/apiClient';

import { PlaygroundOverlay } from './PlaygroundOverlay';
import styles from './PlaygroundCanvas.module.css';

// 모듈 레벨 상수 (매 렌더 재생성 방지)
const nodeTypes = { playground: PlaygroundNode };
const edgeTypes = { playground: PlaygroundEdge };

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
};

type Clarification = {
  eventId: string | null;
  agentName: string;
  question: string;
};

type Approval = {
  eventId: string | null;
  agentName: string;
  reason: string;
};

type SelectedNodeSummary = {
  id: string;
  runId: string | null;
  label: string;
  kind: PlaygroundNodeData['kind'];
  status: PlaygroundNodeData['status'];
};

type NodeSummaryRequest = {
  data: NodeSummary | null;
  error: string | null;
  isLoading: boolean;
};

type PositionOffset = {
  x: number;
  y: number;
};

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function interruptType(metadata: Record<string, unknown> | null | undefined) {
  return metadataString(metadata, 'interrupt_type') ?? metadataString(metadata, 'type');
}

function getClarification(run: RunSummary | null, events: RunEvent[]): Clarification | null {
  let waitingEvent: RunEvent | null = null;

  for (const event of events) {
    if (
      event.event_type === 'human_input.required'
      && interruptType(event.metadata) === 'clarification'
    ) {
      waitingEvent = event;
    }
    if (
      event.event_type === 'human_input.resumed'
      && interruptType(event.metadata) === 'clarification'
    ) {
      waitingEvent = null;
    }
  }

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

  return { eventId: waitingEvent?.event_id ?? null, agentName, question };
}

function getApproval(run: RunSummary | null, events: RunEvent[]): Approval | null {
  if (run?.status !== 'waiting_approval') return null;

  let waitingEvent: RunEvent | null = null;
  for (const event of events) {
    if (event.event_type === 'agent.waiting') waitingEvent = event;
    if (event.event_type === 'human_input.resumed') waitingEvent = null;
  }

  const reason = waitingEvent?.message
    ?? metadataString(run.metadata, 'reason')
    ?? '결과를 승인해 주세요.';
  const rawAgentName = waitingEvent?.node_name ?? 'analysis_agent';

  return { eventId: waitingEvent?.event_id ?? null, agentName: rawAgentName, reason };
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

export function PlaygroundCanvas({ preview, onClosePreview }: PlaygroundCanvasProps) {
  const initialGraph = useMemo(
    () => deriveNodeGraphFromEvents([], playgroundNodes, playgroundEdges),
    [],
  );
  const [nodes, setNodes] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [selectedNodeSummary, setSelectedNodeSummary] = useState<SelectedNodeSummary | null>(null);
  const [nodeSummaryRequest, setNodeSummaryRequest] = useState<NodeSummaryRequest>({
    data: null,
    error: null,
    isLoading: false,
  });
  const hydratedSummaryNodes = useRef(new Set<string>());
  const laneOffsetByRunId = useRef(new Map<string, PositionOffset>());

  const [activeRunId, setActiveRunId] = useState<string | null>(() => getStoredActiveRunId());
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [isSubmittingClarification, setIsSubmittingClarification] = useState(false);
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
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
    // 새로고침으로 복원한 run_id가 더 이상 존재하지 않으면(삭제됨 등) 저장값을 비운다.
    if (runStreamError && !run) {
      clearStoredActiveRunId();
      setActiveRunId(null);
    }
  }, [runStreamError, run]);

  const { collapse } = useSidebar();
  const isRunActive = Boolean(
    activeRunId && (!run || !['succeeded', 'failed', 'cancelled'].includes(run.status)),
  );
  const isGenerating = isStartingRun || isRunActive;
  const clarification = useMemo(() => getClarification(run, visibleEvents), [visibleEvents, run]);
  const approval = useMemo(() => getApproval(run, visibleEvents), [visibleEvents, run]);

  const handleNodesChange = (changes: NodeChange<Node<PlaygroundNodeData>>[]) => {
    setNodes((currentNodes) => {
      const currentById = new Map(currentNodes.map((node) => [node.id, node]));
      const nextNodes = applyNodeChanges(changes, currentNodes);
      const nextById = new Map(nextNodes.map((node) => [node.id, node]));
      const laneDeltaByRunId = new Map<string, PositionOffset>();

      for (const change of changes) {
        if (change.type !== 'position' || !change.position) continue;
        const previous = currentById.get(change.id);
        const next = nextById.get(change.id);
        const runId = previous?.data.runId;
        if (!previous || !next || !runId) continue;
        const deltaX = next.position.x - previous.position.x;
        const deltaY = next.position.y - previous.position.y;
        if (!deltaX && !deltaY) continue;
        const previousDelta = laneDeltaByRunId.get(runId) ?? { x: 0, y: 0 };
        laneDeltaByRunId.set(runId, {
          x: previousDelta.x + deltaX,
          y: previousDelta.y + deltaY,
        });
      }

      if (!laneDeltaByRunId.size) return nextNodes;

      laneDeltaByRunId.forEach((delta, runId) => {
        const previousOffset = laneOffsetByRunId.current.get(runId) ?? { x: 0, y: 0 };
        laneOffsetByRunId.current.set(runId, {
          x: previousOffset.x + delta.x,
          y: previousOffset.y + delta.y,
        });
      });

      const movedIds = new Set(
        changes
          .filter((change) => change.type === 'position')
          .map((change) => change.id),
      );
      return nextNodes.map((node) => {
        const runId = node.data.runId;
        const delta = runId ? laneDeltaByRunId.get(runId) : undefined;
        if (!delta || movedIds.has(node.id)) return node;
        return {
          ...node,
          position: {
            ...node.position,
            x: node.position.x + delta.x,
            y: node.position.y + delta.y,
          },
        };
      });
    });
  };

  useEffect(() => {
    setIsSubmittingClarification(false);
    setClarificationError(null);
  }, [clarification?.eventId]);

  useEffect(() => {
    setIsSubmittingApproval(false);
    setApprovalError(null);
  }, [approval?.eventId]);

  useEffect(() => {
    const nextGraph = deriveNodeGraphFromEvents(visibleEvents, playgroundNodes, playgroundEdges);
    setNodes((currentNodes) => {
      const manualNodes = currentNodes.filter((node) => node.id.startsWith('manual-'));

      const eventNodes = nextGraph.nodes.map((node) => {
        const offset = node.data.runId ? laneOffsetByRunId.current.get(node.data.runId) : undefined;
        const data = { ...node.data, onDeleteRun: handleDeleteRunStable };
        if (!offset || (!offset.x && !offset.y)) return { ...node, data };
        return {
          ...node,
          position: {
            ...node.position,
            x: node.position.x + offset.x,
            y: node.position.y + offset.y,
          },
          data,
        };
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

  const handlePromptSend = async (prompt: string) => {
    if (isGenerating) return;

    const sessionId = getCurrentSessionId();
    if (!sessionId) {
      console.error('선택된 세션이 없습니다.');
      return;
    }

    setIsStartingRun(true);
    setActiveRunId(null);
    setSelectedNodeSummary(null);
    setVisibleEvents([]);

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

  const handleClarificationSend = async (answer: string) => {
    if (!activeRunId || !clarification || isSubmittingClarification) return;

    setIsSubmittingClarification(true);
    setClarificationError(null);
    try {
      await resumeAgentRun(activeRunId, answer);
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
    } catch (error) {
      const message = error instanceof BackendApiError
        ? error.message
        : '승인 처리를 전송하지 못했습니다. 다시 시도해 주세요.';
      setApprovalError(message);
      setIsSubmittingApproval(false);
      throw error;
    }
  };

  const handleCreateNode = (kind: CreatableNodeKind) => {
    const selectedNode = nodes.find((node) => node.selected);
    const childCount = selectedNode
      ? edges.filter((edge) => edge.source === selectedNode.id).length
      : 0;
    const nodeId = `manual-${crypto.randomUUID()}`;

    setNodes((currentNodes) => {
      const manualNodeCount = currentNodes.filter((node) => node.id.startsWith('manual-')).length;
      const column = manualNodeCount % 3;
      const row = Math.floor(manualNodeCount / 3);

      return [
        ...currentNodes,
        {
          id: nodeId,
          type: 'playground',
          position: selectedNode
            ? {
                x: selectedNode.position.x + 460,
                y: selectedNode.position.y + childCount * 200,
              }
            : { x: 280 + column * 384, y: 320 + row * 200 },
          data: {
            ...NODE_DEFAULTS[kind],
            kind,
            status: 'idle',
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

  const handleEdgeClick = (_event: ReactMouseEvent, clickedEdge: Edge) => {
    setEdges((currentEdges) => currentEdges.map((edge) => {
      if (edge.id !== clickedEdge.id) return edge;

      const isActive = edge.data?.flowState === 'active';
      return {
        ...edge,
        zIndex: isActive ? 0 : 10,
        data: {
          ...edge.data,
          flowState: isActive ? 'idle' : 'active',
        },
      };
    }));
  };

  const handleNodeClick = (_event: ReactMouseEvent, node: Node<PlaygroundNodeData>) => {
    setSelectedNodeSummary({
      id: node.id,
      runId: node.data.runId ?? activeRunId,
      label: node.data.label,
      kind: node.data.kind,
      status: node.data.status,
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
      const branchRun = await branchAgentRun(branchSourceRunId, startStage, prompt);
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

  const handlePaneClick = () => {
    setSelectedNodeSummary(null);
    collapse();
  };

  return (
    <div className={styles.canvas}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        selectNodesOnDrag={false}
        fitView
      >
      </ReactFlow>

      <PlaygroundOverlay
        isGenerating={isGenerating}
        onPromptSend={handlePromptSend}
        clarification={clarification}
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
        onBranchPromptSend={handleBranchPromptSend}
        preview={preview}
        onClosePreview={onClosePreview}
        onCreateNode={handleCreateNode}
      />
    </div>
  );
}
