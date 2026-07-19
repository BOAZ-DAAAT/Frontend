import {
  BaseEdge,
  getBezierPath,
  Position,
  type EdgeProps,
} from '@xyflow/react';
import { useEffect, useState } from 'react';

import styles from './PlaygroundEdge.module.css';

const CURVATURE = 0.32;
const WAVE_POINT_COUNT = 18;
const WAVE_SPEED = 1.35;

type Point = { x: number; y: number };

function calculateControlOffset(distance: number) {
  return distance >= 0 ? distance / 2 : CURVATURE * 25 * Math.sqrt(-distance);
}

function getControlPoint(position: Position, point: Point, oppositePoint: Point): Point {
  switch (position) {
    case Position.Left:
      return { x: point.x - calculateControlOffset(point.x - oppositePoint.x), y: point.y };
    case Position.Right:
      return { x: point.x + calculateControlOffset(oppositePoint.x - point.x), y: point.y };
    case Position.Top:
      return { x: point.x, y: point.y - calculateControlOffset(point.y - oppositePoint.y) };
    case Position.Bottom:
      return { x: point.x, y: point.y + calculateControlOffset(oppositePoint.y - point.y) };
  }
}

function getCubicPoint(start: Point, sourceControl: Point, targetControl: Point, end: Point, t: number): Point {
  const inverseT = 1 - t;

  return {
    x: inverseT ** 3 * start.x
      + 3 * inverseT ** 2 * t * sourceControl.x
      + 3 * inverseT * t ** 2 * targetControl.x
      + t ** 3 * end.x,
    y: inverseT ** 3 * start.y
      + 3 * inverseT ** 2 * t * sourceControl.y
      + 3 * inverseT * t ** 2 * targetControl.y
      + t ** 3 * end.y,
  };
}

function getCubicTangent(start: Point, sourceControl: Point, targetControl: Point, end: Point, t: number): Point {
  const inverseT = 1 - t;

  return {
    x: 3 * inverseT ** 2 * (sourceControl.x - start.x)
      + 6 * inverseT * t * (targetControl.x - sourceControl.x)
      + 3 * t ** 2 * (end.x - targetControl.x),
    y: 3 * inverseT ** 2 * (sourceControl.y - start.y)
      + 6 * inverseT * t * (targetControl.y - sourceControl.y)
      + 3 * t ** 2 * (end.y - targetControl.y),
  };
}

function createWavePath(
  start: Point,
  sourceControl: Point,
  targetControl: Point,
  end: Point,
  time: number,
  phase: number,
  amplitude: number,
) {
  return Array.from({ length: WAVE_POINT_COUNT }, (_, index) => {
    const t = index / (WAVE_POINT_COUNT - 1);
    const point = getCubicPoint(start, sourceControl, targetControl, end, t);
    const tangent = getCubicTangent(start, sourceControl, targetControl, end, t);
    const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
    const normal = { x: -tangent.y / tangentLength, y: tangent.x / tangentLength };
    const envelope = Math.sin(Math.PI * t);
    const offset = Math.sin(Math.PI * 2.4 * t + time * WAVE_SPEED + phase) * envelope * amplitude;
    const x = point.x + normal.x * offset;
    const y = point.y + normal.y * offset;

    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

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
  const [waveTime, setWaveTime] = useState(0);
  const isActive = data?.flowState === 'active';
  const start = { x: sourceX, y: sourceY };
  const end = { x: targetX, y: targetY };
  const sourceControl = getControlPoint(sourcePosition, start, end);
  const targetControl = getControlPoint(targetPosition, end, start);
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
    if (!isActive || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setWaveTime(0);
      return;
    }

    let frame = 0;
    const startTime = window.performance.now();
    const animate = (now: number) => {
      setWaveTime((now - startTime) / 1000);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [isActive]);

  if (isActive) {
    const grayWaveOne = createWavePath(start, sourceControl, targetControl, end, waveTime, 0.9, 4.5);
    const blueWave = createWavePath(start, sourceControl, targetControl, end, waveTime, 3, 3.25);
    const grayWaveTwo = createWavePath(start, sourceControl, targetControl, end, waveTime, 5.1, 5.25);

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          className={styles.activeInteraction}
          interactionWidth={interactionWidth ?? 16}
          markerEnd={markerEnd}
          markerStart={markerStart}
          style={style}
        />
        <path className={`${styles.wave} ${styles.waveGray}`} d={grayWaveOne} />
        <path className={`${styles.wave} ${styles.waveBlue}`} d={blueWave} />
        <path className={`${styles.wave} ${styles.waveGraySoft}`} d={grayWaveTwo} />
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
