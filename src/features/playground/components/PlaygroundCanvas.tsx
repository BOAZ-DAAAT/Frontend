import { ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import { useEffect, useMemo, useState } from 'react';

import '@xyflow/react/dist/style.css';

import { createAgentRun } from '@/features/agent-runs/api';
import { useAgentRunPolling } from '@/features/agent-runs/hooks';
import { playgroundEdges, playgroundNodes } from '@/features/playground/mocks';
import { PlaygroundNode } from '@/features/playground/node/PlaygroundNode';
import { deriveNodeGraphFromEvents } from '@/features/playground/runEventGraph';
import { useSidebar } from '@/features/playground/sidebar/SidebarContext';
import { getCurrentSessionId } from '@/features/session/currentSession';

import { PlaygroundOverlay } from './PlaygroundOverlay';
import styles from './PlaygroundCanvas.module.css';

// 모듈 레벨 상수 (매 렌더 재생성 방지)
const nodeTypes = { playground: PlaygroundNode };

type PlaygroundCanvasProps = {
  preview: { sessionId: string; table: string } | null;
  onClosePreview: () => void;
};

export function PlaygroundCanvas({ preview, onClosePreview }: PlaygroundCanvasProps) {
  const initialGraph = useMemo(
    () => deriveNodeGraphFromEvents([], playgroundNodes, playgroundEdges),
    [],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [isStartingRun, setIsStartingRun] = useState(false);
  const { run, events } = useAgentRunPolling(activeRunId);

  const { collapse } = useSidebar();
  const isRunActive = Boolean(
    activeRunId && (!run || !['succeeded', 'failed', 'cancelled'].includes(run.status)),
  );
  const isGenerating = isStartingRun || isRunActive;

  useEffect(() => {
    const nextGraph = deriveNodeGraphFromEvents(events, playgroundNodes, playgroundEdges);
    setNodes((currentNodes) => {
      const currentNodesById = new Map(currentNodes.map((node) => [node.id, node]));
      return nextGraph.nodes.map((node) => {
        const currentNode = currentNodesById.get(node.id);
        return currentNode
          ? { ...node, position: currentNode.position }
          : node;
      });
    });
    setEdges(nextGraph.edges);
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

  return (
    <div className={`${styles.canvas} ${isGenerating ? styles.generating : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={collapse}
        fitView
      >
      </ReactFlow>

      <PlaygroundOverlay
        isGenerating={isGenerating}
        onPromptSend={handlePromptSend}
        preview={preview}
        onClosePreview={onClosePreview}
      />
    </div>
  );
}
