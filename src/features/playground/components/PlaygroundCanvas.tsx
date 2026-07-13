import { ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import { useState } from 'react';

import '@xyflow/react/dist/style.css';

import { playgroundEdges, playgroundNodes } from '@/features/playground/mocks';
import { PlaygroundNode } from '@/features/playground/node/PlaygroundNode';
import { useSidebar } from '@/features/playground/sidebar/SidebarContext';

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

    setIsGenerating(true);

    try {
      // 지금은 LLM 연결 대신 10초 동안 실행 상태를 테스트한다.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 10_000);
      });
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
