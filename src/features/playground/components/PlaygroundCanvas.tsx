import { ReactFlow, useEdgesState, useNodesState, type Edge, type Node } from '@xyflow/react';
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

import '@xyflow/react/dist/style.css';

import { createAgentRun, resumeAgentRun, resumeAgentRunApproval } from '@/features/agent-runs/api';
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
  label: string;
  kind: PlaygroundNodeData['kind'];
  status: PlaygroundNodeData['status'];
};

type NodeSummaryRequest = {
  data: NodeSummary | null;
  error: string | null;
  isLoading: boolean;
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

export function PlaygroundCanvas({ preview, onClosePreview }: PlaygroundCanvasProps) {
  const initialGraph = useMemo(
    () => deriveNodeGraphFromEvents([], playgroundNodes, playgroundEdges),
    [],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [selectedNodeSummary, setSelectedNodeSummary] = useState<SelectedNodeSummary | null>(null);
  const [nodeSummaryRequest, setNodeSummaryRequest] = useState<NodeSummaryRequest>({
    data: null,
    error: null,
    isLoading: false,
  });
  const hydratedSummaryNodes = useRef(new Set<string>());

  const [activeRunId, setActiveRunId] = useState<string | null>(() => getStoredActiveRunId());
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [isSubmittingClarification, setIsSubmittingClarification] = useState(false);
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const { run, events, error: runStreamError } = useAgentRunStream(activeRunId);

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
  const clarification = useMemo(() => getClarification(run, events), [events, run]);
  const approval = useMemo(() => getApproval(run, events), [events, run]);

  useEffect(() => {
    setIsSubmittingClarification(false);
    setClarificationError(null);
  }, [clarification?.eventId]);

  useEffect(() => {
    setIsSubmittingApproval(false);
    setApprovalError(null);
  }, [approval?.eventId]);

  useEffect(() => {
    const nextGraph = deriveNodeGraphFromEvents(events, playgroundNodes, playgroundEdges);
    setNodes((currentNodes) => {
      const currentNodesById = new Map(currentNodes.map((node) => [node.id, node]));
      const eventNodes = nextGraph.nodes.map((node) => {
        const currentNode = currentNodesById.get(node.id);
        return currentNode
          ? { ...node, position: currentNode.position }
          : node;
      });
      const manualNodes = currentNodes.filter((node) => node.id.startsWith('manual-'));

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

    if (activeRunId) {
      for (const node of nextGraph.nodes) {
        if (node.data.status !== 'success') continue;
        const hydrationKey = `${activeRunId}:${node.id}`;
        if (hydratedSummaryNodes.current.has(hydrationKey)) continue;
        hydratedSummaryNodes.current.add(hydrationKey);
        void getAgentNodeSummary(activeRunId, node.id)
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
    }
  }, [activeRunId, events, setEdges, setNodes]);

  useEffect(() => {
    setSelectedNodeSummary((selected) => {
      if (!selected) return null;
      const currentNode = nodes.find((node) => node.id === selected.id);
      if (!currentNode || currentNode.data.status === selected.status) return selected;
      return {
        ...selected,
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
    if (!activeRunId || selectedNodeSummary.status !== 'success') {
      setNodeSummaryRequest({ data: null, error: null, isLoading: false });
      return () => { cancelled = true; };
    }

    setNodeSummaryRequest({ data: null, error: null, isLoading: true });
    getAgentNodeSummary(activeRunId, selectedNodeSummary.id)
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
  }, [activeRunId, selectedNodeSummary]);

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
      label: node.data.label,
      kind: node.data.kind,
      status: node.data.status,
    });
  };

  const handleBranchPromptSend = async (_prompt: string) => {
    // 노드 분기 실행 API는 서머리 데이터 계약이 정해진 뒤 연결한다.
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
        onNodesChange={onNodesChange}
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
        nodeSummaryRunId={activeRunId}
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
