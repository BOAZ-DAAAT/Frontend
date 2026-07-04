import {
  Handle,
  Position,
  useNodeConnections,
  type Node,
  type NodeProps,
} from '@xyflow/react';

import ChartIcon from '@/components/icons/Chart.svg?react';

import type { PlaygroundNodeData } from '../types';
import styles from './PlaygroundNode.module.css';

type PlaygroundNodeType = Node<PlaygroundNodeData, 'playground'>;

export function PlaygroundNode({ data }: NodeProps<PlaygroundNodeType>) {
  // 각 handle에 연결된 엣지가 있을 때만 검정 원을 표시
  const targetConnections = useNodeConnections({ handleType: 'target' });
  const sourceConnections = useNodeConnections({ handleType: 'source' });

  const hasTarget = targetConnections.length > 0;
  const hasSource = sourceConnections.length > 0;

  return (
    <div className={styles.node}>
      <Handle type="target" position={Position.Left} style={{ opacity: hasTarget ? 1 : 0 }} />

      <div className={styles.header}>
        <span className={styles.iconBox}>
          <ChartIcon className={styles.icon} />
        </span>
        <span className={styles.title}>{data.label}</span>
      </div>

      <p className={styles.description}>{data.description}</p>

      <Handle type="source" position={Position.Right} style={{ opacity: hasSource ? 1 : 0 }} />
    </div>
  );
}
