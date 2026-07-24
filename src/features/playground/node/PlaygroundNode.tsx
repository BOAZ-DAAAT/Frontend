import {
  Handle,
  Position,
  useNodes,
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

import { BlobOrb } from '@/pages/BlobPage';

import { InlineNodeEditor } from '../node-editor';
import type { PlaygroundNodeData, PlaygroundNodeKind } from '../types';
import styles from './PlaygroundNode.module.css';

type PlaygroundNodeType = Node<PlaygroundNodeData, 'playground'>;

const NODE_ICONS: Record<PlaygroundNodeKind, LucideIcon> = {
  supervisor: ScanSearch,
  datasource: Database,
  'sql-agent': SquareTerminal,
  'EDA-agent': ChartNoAxesCombined,
  'analysis-agent': ScanSearch,
  'insight-agent': Lightbulb,
};

export function PlaygroundNode({ data, selected }: NodeProps<PlaygroundNodeType>) {
  const [isQueryOpen, setIsQueryOpen] = useState(false);
  const NodeIcon = NODE_ICONS[data.kind];
  const isSelecting = data.status === 'selecting';
  const isWorking = (
    isSelecting
    || data.status === 'running'
    || data.status === 'waiting'
  );
  const flowRunning = useNodes<PlaygroundNodeType>().some(
    (node) => (
      node.data.status === 'selecting'
      || node.data.status === 'running'
      || node.data.status === 'waiting'
    ),
  );
  const isActive = (
    data.status === 'running'
    || data.status === 'waiting'
    || (selected && !flowRunning)
  );
  const canDeleteRun = Boolean(!isSelecting && data.runId && data.onDeleteRun);

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
        className={`${styles.node} ${
          isSelecting ? styles.nodeSelecting : ''
        } ${isWorking ? styles.nodeWorking : ''} ${
          isActive ? styles.nodeActive : ''
        }`}
      >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={styles.edgeAnchor}
      />

      <div className={styles.header}>
        <span
          className={`${styles.iconBox} ${
            isWorking ? styles.iconBoxWorking : ''
          } ${
            data.status === 'success' ? styles.iconBoxSuccess : ''
          } ${
            data.status === 'waiting' ? styles.iconBoxWaiting : ''
          } ${
            data.status === 'error' ? styles.iconBoxError : ''
          }`}
        >
          <span
            className={styles.iconBlob}
            aria-hidden="true"
          >
            <BlobOrb
              active={false}
              motion={0.48}
              speed={0.42}
            />
          </span>
          {!isWorking ? <NodeIcon className={styles.icon} /> : null}
        </span>
        {isSelecting ? (
          <span className={styles.title}>{data.label}</span>
        ) : (
          <InlineNodeEditor
            value={data.label}
            label="노드 제목"
            className={styles.title}
          />
        )}
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
          {isWorking ? (
            <p className={`${styles.description} ${styles.workingDescription}`}>
              {data.description}
            </p>
          ) : (
            <InlineNodeEditor
              multiline
              value={data.description}
              label="노드 작업 요약"
              className={styles.description}
            />
          )}
        </div>

        {!isWorking && data.chart ? (
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
