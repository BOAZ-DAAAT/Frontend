import { ReactFlow, useEdgesState, useNodesState, type Edge } from '@xyflow/react';
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';

import '@xyflow/react/dist/style.css';

import { createAgentRun, resumeAgentRun } from '@/features/agent-runs/api';
import { useAgentRunStream } from '@/features/agent-runs/hooks';
import { PlaygroundEdge } from '@/features/playground/edge/PlaygroundEdge';
import { playgroundEdges, playgroundNodes } from '@/features/playground/mocks';
import type { CreatableNodeKind } from '@/features/playground/node-editor';
import { PlaygroundNode } from '@/features/playground/node/PlaygroundNode';
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

export function PlaygroundCanvas({ preview, onClosePreview }: PlaygroundCanvasProps) {
  const initialGraph = useMemo(
    () => deriveNodeGraphFromEvents([], playgroundNodes, playgroundEdges),
    [],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [isSubmittingClarification, setIsSubmittingClarification] = useState(false);
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const { run, events } = useAgentRunStream(activeRunId);

  const { collapse } = useSidebar();
  const isRunActive = Boolean(
    activeRunId && (!run || !['succeeded', 'failed', 'cancelled'].includes(run.status)),
  );
  const isGenerating = isStartingRun || isRunActive;
  const clarification = useMemo(() => getClarification(run, events), [events, run]);

  useEffect(() => {
    setIsSubmittingClarification(false);
    setClarificationError(null);
  }, [clarification?.eventId]);

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
  }, [events, setEdges, setNodes]);

  const handlePromptSend = async (prompt: string) => {
    if (isGenerating) return;

    const sessionId = getCurrentSessionId();
    if (!sessionId) {
      console.error('선택된 세션이 없습니다.');
      return;
    }

    setIsStartingRun(true);
    setActiveRunId(null);

    try {
      const run = await createAgentRun(sessionId, prompt);
      setActiveRunId(run.run_id);
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

  return (
    <div className={styles.canvas}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={handleEdgeClick}
        onPaneClick={collapse}
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
        preview={preview}
        onClosePreview={onClosePreview}
        onCreateNode={handleCreateNode}
      />
    </div>
  );
}
