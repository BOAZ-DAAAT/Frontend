import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { playgroundEdges, playgroundNodes } from '@/features/playground/mocks';

import { PlaygroundOverlay } from './PlaygroundOverlay';
import styles from './PlaygroundCanvas.module.css';

export function PlaygroundCanvas() {
  const [nodes, , onNodesChange] = useNodesState([]);
  const [edges, , onEdgesChange] = useEdgesState([]);

  return (
    <div className={styles.canvas}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background color="var(--color-background-dot)" gap={24} size={2} />
      </ReactFlow>

      <PlaygroundOverlay />
    </div>
  );
}
