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
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

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
  const [isQueryOpen, setIsQueryOpen] = useState(false);
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
  const canDeleteRun = Boolean(data.runId && data.onDeleteRun);

  return (
    <div className={styles.wrapper}>
      {data.queryLabel && data.queryText ? (
        <button
          type="button"
          className={styles.queryBadge}
          title={data.queryText}
          aria-expanded={isQueryOpen}
          aria-label={`${data.queryLabel} 전체 보기`}
          onClick={(event) => {
            event.stopPropagation();
            setIsQueryOpen((current) => !current);
          }}
        >
          <span className={styles.queryBadgeLabel}>{data.queryLabel}</span>
          <span className={styles.queryBadgeText}>{data.queryText}</span>
        </button>
      ) : null}
      {data.queryLabel && data.queryText && isQueryOpen ? (
        <div className={styles.queryPopover} role="dialog" aria-label={`${data.queryLabel} 전체 내용`}>
          <div className={styles.queryPopoverLabel}>{data.queryLabel}</div>
          <p className={styles.queryPopoverText}>{data.queryText}</p>
        </div>
      ) : null}
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

      {isFlowActive ? (
        <svg
          className={`${styles.borderFlow} ${
            hasActiveSource ? styles.borderFlowSource : ''
          } ${hasActiveTarget ? styles.borderFlowTarget : ''}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className={`${styles.borderFlowPath} ${styles.borderFlowTop}`}
            d="M 0 50 L 0 6 Q 0 0 6 0 L 94 0 Q 100 0 100 6 L 100 50"
            pathLength={100}
          />
          <path
            className={`${styles.borderFlowPath} ${styles.borderFlowBottom}`}
            d="M 0 50 L 0 94 Q 0 100 6 100 L 94 100 Q 100 100 100 94 L 100 50"
            pathLength={100}
          />
        </svg>
      ) : null}

      <div className={styles.header}>
        <span className={styles.iconBox}>
          <NodeIcon className={styles.icon} />
        </span>
        <InlineNodeEditor
          value={data.label}
          label="노드 제목"
          className={styles.title}
        />
        {canDeleteRun ? (
          <button
            type="button"
            className={styles.deleteButton}
            aria-label={`${data.label} run 삭제`}
            onClick={(event) => {
              event.stopPropagation();
              if (data.runId) data.onDeleteRun?.(data.runId, data.label);
            }}
          >
            <X className={styles.deleteIcon} />
          </button>
        ) : null}
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
    </div>
  );
}
