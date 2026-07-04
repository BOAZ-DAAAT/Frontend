import { Background, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';

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
  const { collapse } = useSidebar();

  return (
    <div className={styles.canvas}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={collapse}
        fitView
      >
        <Background color="var(--color-background-dot)" gap={24} size={2} />
      </ReactFlow>

      <PlaygroundOverlay />
    </div>
  );
}
