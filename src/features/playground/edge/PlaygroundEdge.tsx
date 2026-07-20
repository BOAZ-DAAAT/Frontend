import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

import styles from './PlaygroundEdge.module.css';

const CURVATURE = 0.32;

export function PlaygroundEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  interactionWidth,
  markerEnd,
  markerStart,
  style,
  data,
}: EdgeProps) {
  const isActive = data?.flowState === 'active';
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: CURVATURE,
  });

  if (isActive) {
    return (
      <>
        <path className={styles.activeHighlight} d={edgePath} />
        <BaseEdge
          id={id}
          path={edgePath}
          className={styles.activeInteraction}
          interactionWidth={interactionWidth ?? 16}
          markerEnd={markerEnd}
          markerStart={markerStart}
          style={{ ...style, stroke: 'transparent' }}
        />
      </>
    );
  }

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      className={styles.edge}
      interactionWidth={interactionWidth ?? 16}
      markerEnd={markerEnd}
      markerStart={markerStart}
      style={style}
    />
  );
}
