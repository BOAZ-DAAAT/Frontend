import {
  Handle,
  Position,
  useEdges,
  useNodeConnections,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  ChartNoAxesCombined,
  Database,
  Lightbulb,
  ScanSearch,
  SquareTerminal,
  type LucideIcon,
} from 'lucide-react';

import { InlineNodeEditor } from '../node-editor';
import type { PlaygroundNodeData, PlaygroundNodeKind } from '../types';
import styles from './PlaygroundNode.module.css';

type PlaygroundNodeType = Node<PlaygroundNodeData, 'playground'>;

const NODE_ICONS: Record<PlaygroundNodeKind, LucideIcon> = {
  datasource: Database,
  'sql-agent': SquareTerminal,
  'EDA-agent': ChartNoAxesCombined,
  'analysis-agent': ScanSearch,
  'insight-agent': Lightbulb,
};

export function PlaygroundNode({ data, selected }: NodeProps<PlaygroundNodeType>) {
  const NodeIcon = NODE_ICONS[data.kind];
  const edges = useEdges();
  const targetConnections = useNodeConnections({ handleType: 'target' });
  const sourceConnections = useNodeConnections({ handleType: 'source' });
  const activeEdgeIds = new Set(
    edges
      .filter((edge) => edge.data?.flowState === 'active')
      .map((edge) => edge.id),
  );
  const hasActiveTarget = targetConnections.some((connection) => activeEdgeIds.has(connection.edgeId));
  const hasActiveSource = sourceConnections.some((connection) => activeEdgeIds.has(connection.edgeId));
  const isFlowActive = hasActiveTarget || hasActiveSource;

  return (
    <div
      className={`${styles.node} ${selected ? styles.nodeSelected : ''} ${
        isFlowActive ? styles.nodeFlowActive : ''
      } ${
        hasActiveSource ? styles.nodeSourceConnected : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={styles.edgeAnchor}
      />

      <div className={styles.header}>
        <span className={styles.iconBox}>
          <NodeIcon className={styles.icon} />
        </span>
        <InlineNodeEditor
          value={data.label}
          label="노드 제목"
          className={styles.title}
        />
      </div>

      <div className={styles.body}>
        <div className={styles.content}>
          <InlineNodeEditor
            multiline
            value={data.description}
            label="노드 작업 요약"
            className={styles.description}
          />
        </div>

        {data.chart ? (
          <div className={styles.chartBox} role="img" aria-label={data.chart.label}>
            <div className={styles.chartPlot}>
              {data.chart.values.map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  className={styles.chartBar}
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={styles.edgeAnchor}
      />
    </div>
  );
}
