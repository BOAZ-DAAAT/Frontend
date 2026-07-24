import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { useEffect, useState } from 'react';

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
  const [hasPendingEntrance, setHasPendingEntrance] = useState(
    () => data?.animateOnCreate === true,
  );
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: CURVATURE,
  });

  useEffect(() => {
    if (!isActive || !hasPendingEntrance) return undefined;

    const timer = window.setTimeout(() => setHasPendingEntrance(false), 720);
    return () => window.clearTimeout(timer);
  }, [hasPendingEntrance, isActive]);

  if (isActive) {
    return (
      <>
        <path
          className={`${styles.activeHighlight} ${
            hasPendingEntrance ? styles.activeHighlightEntering : ''
          }`}
          d={edgePath}
        />
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
