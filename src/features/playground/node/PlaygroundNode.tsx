import {
  Handle,
  Position,
  useNodes,
  useUpdateNodeInternals,
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
import { useEffect, useRef, type CSSProperties } from 'react';

import { BlobOrb } from '@/pages/BlobPage';

import { InlineNodeEditor } from '../node-editor';
import {
  ERROR_NODE_DESCRIPTION,
  type PlaygroundNodeData,
  type PlaygroundNodeKind,
  type PlaygroundNodeQuery,
} from '../types';
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

export function PlaygroundNode({ id, data, selected }: NodeProps<PlaygroundNodeType>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const measuredWidthRef = useRef<number | null>(null);
  const animateEntranceRef = useRef(data.animateOnCreate === true);
  const updateNodeInternals = useUpdateNodeInternals();
  const NodeIcon = NODE_ICONS[data.kind];
  const isSelecting = data.status === 'selecting';
  const isError = data.status === 'error';
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
  const enterDelay = Math.max((data.nodeSequence ?? 1) - 1, 0) * 90;
  const queryBadges: PlaygroundNodeQuery[] = data.queryBadges
    ?? (data.queryLabel && data.queryText ? [{ label: data.queryLabel, text: data.queryText }] : []);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = entry.contentRect.width;
      if (measuredWidthRef.current === nextWidth) return;
      measuredWidthRef.current = nextWidth;
      updateNodeInternals(id);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [id, updateNodeInternals]);

  return (
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${
        animateEntranceRef.current ? styles.wrapperEntering : ''
      }`}
      style={{ '--node-enter-delay': `${enterDelay}ms` } as CSSProperties}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) {
          updateNodeInternals(id);
        }
      }}
    >
      {queryBadges.length ? (
        <div
          className={styles.queryBadgeStack}
          aria-label="이 노드의 쿼리"
          onMouseLeave={() => data.onFlowHover?.(null)}
        >
          {queryBadges.map((query, index) => (
            <div
              key={`${query.label}:${query.text}:${index}`}
              className={styles.queryBadge}
              aria-label={`${query.label}: ${query.text}`}
              onMouseEnter={(event) => {
                const badge = event.currentTarget;
                requestAnimationFrame(() => {
                  badge.style.setProperty('--query-badge-expanded-height', `${badge.scrollHeight}px`);
                });
                data.onFlowHover?.(query.flowNodeId ?? id);
              }}
            >
              <span className={styles.queryBadgeText}>{query.text}</span>
            </div>
          ))}
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
          }`}
        >
          <span className={styles.iconBlob} aria-hidden="true">
            <BlobOrb
              active={isWorking}
              motion={isWorking ? 1 : 0.48}
              speed={isWorking ? 0.46 : 0.20}
              tone={isError ? 'error' : 'default'}
            />
          </span>
          {!isWorking ? <NodeIcon className={styles.icon} aria-hidden="true" /> : null}
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
          ) : isError ? (
            <p className={styles.description}>{ERROR_NODE_DESCRIPTION}</p>
          ) : (
            <InlineNodeEditor
              multiline
              value={data.description}
              label="노드 작업 요약"
              className={styles.description}
            />
          )}
        </div>

        {!isWorking && !isError && data.chart ? (
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
