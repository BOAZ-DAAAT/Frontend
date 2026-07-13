import { ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import { useState } from 'react';

import '@xyflow/react/dist/style.css';

import { createAgentRun } from '@/features/agent-runs/api';
import { playgroundEdges, playgroundNodes } from '@/features/playground/mocks';
import { PlaygroundNode } from '@/features/playground/node/PlaygroundNode';
import { useSidebar } from '@/features/playground/sidebar/SidebarContext';
import { getCurrentSessionId } from '@/features/session/currentSession';

import { PlaygroundOverlay } from './PlaygroundOverlay';
import styles from './PlaygroundCanvas.module.css';

// 모듈 레벨 상수 (매 렌더 재생성 방지)
const nodeTypes = { playground: PlaygroundNode };

export function PlaygroundCanvas() {
  // 디자인 확인용 샘플 2노드 + 엣지 1개
  const [nodes, , onNodesChange] = useNodesState(playgroundNodes.slice(0, 2));
  const [edges, , onEdgesChange] = useEdgesState(playgroundEdges.slice(0, 1));

  const [isGenerating, setIsGenerating] = useState(false);

  const { collapse } = useSidebar();

  const handlePromptSend = async (prompt: string) => {
    if (isGenerating) return;

    const sessionId = getCurrentSessionId();
    if (!sessionId) {
      console.error('선택된 세션이 없습니다.');
      return;
    }

    setIsGenerating(true);

    try {
      const run = await createAgentRun(sessionId, prompt);
      console.info('Agent run created:', run);
    } catch (error) {
      console.error('Agent run failed:', error);
    } finally {
      setIsGenerating(false);
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
      />
    </div>
  );
}
