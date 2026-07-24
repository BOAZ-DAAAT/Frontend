import { Pause, Play, RotateCcw, SquareTerminal } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ERROR_NODE_DESCRIPTION } from '@/features/playground/types';

import { BlobOrb } from './BlobPage';
import styles from './NodePage.module.css';

type NodePreviewPhase = 'selecting' | 'running' | 'complete' | 'error';

const PHASES: Array<{
  id: NodePreviewPhase;
  label: string;
}> = [
  { id: 'selecting', label: 'Agent 선택 중' },
  { id: 'running', label: '작업 중' },
  { id: 'complete', label: '완료' },
  { id: 'error', label: '오류' },
];

const NEXT_PHASE: Record<NodePreviewPhase, NodePreviewPhase> = {
  selecting: 'running',
  running: 'complete',
  complete: 'error',
  error: 'selecting',
};

const NODE_CONTENT: Record<Exclude<NodePreviewPhase, 'selecting'>, {
  title: string;
  description: string;
}> = {
  running: {
    title: 'SQL Agent',
    description: '분석 요청에 필요한 데이터와 집계 기준을 확인하고 SQL을 구성하고 있습니다.',
  },
  complete: {
    title: 'SQL Agent',
    description: '판매자별 배송 소요일과 리뷰 점수를 연결한 분석용 데이터를 준비했습니다.',
  },
  error: {
    title: 'SQL Agent',
    description: ERROR_NODE_DESCRIPTION,
  },
};

type PreviewNodeCardProps = {
  phase: NodePreviewPhase;
  staticNode?: boolean;
};

function PreviewNodeCard({ phase, staticNode = false }: PreviewNodeCardProps) {
  const isSelecting = phase === 'selecting';
  const showsWorkingBlob = phase === 'selecting' || phase === 'running';
  const isError = phase === 'error';
  const content = isSelecting ? null : NODE_CONTENT[phase];

  return (
    <div
      className={`${styles.node} ${
        isSelecting ? styles.nodeGhost : ''
      } ${phase === 'running' ? styles.nodeRunning : ''} ${
        phase === 'complete' || phase === 'error' ? styles.nodeComplete : ''
      } ${staticNode ? styles.nodeStatic : ''}`}
    >
      <div className={styles.header}>
        <div className={`${styles.agentMark} ${showsWorkingBlob ? styles.agentMarkGhost : ''}`}>
          <span className={styles.orb} aria-hidden="true">
            <BlobOrb
              active={showsWorkingBlob}
              motion={showsWorkingBlob ? 1 : 0.48}
              speed={showsWorkingBlob ? 0.46 : 0.20}
              tone={isError ? 'error' : 'default'}
            />
          </span>
          {!showsWorkingBlob
            ? <SquareTerminal className={styles.agentIcon} aria-hidden="true" />
            : null}
        </div>

        <div key={phase} className={styles.title}>
          {isSelecting ? 'Agent 선택 중' : content?.title}
        </div>
      </div>

      <div className={styles.body}>
        {isSelecting ? (
          <div className={styles.ghostContent}>
            <p className={styles.ghostStatus}>분석 계획과 현재 근거를 검토하고 있습니다.</p>
          </div>
        ) : (
          <p
            key={phase}
            className={`${styles.description} ${
              phase === 'running' ? styles.workingDescription : ''
            }`}
          >
            {content?.description}
          </p>
        )}
      </div>
    </div>
  );
}

export function NodePage() {
  const [phase, setPhase] = useState<NodePreviewPhase>('selecting');
  const [isPlaying, setIsPlaying] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);
  const [isEntrancePreview, setIsEntrancePreview] = useState(false);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = window.setInterval(() => {
      setPhase((current) => NEXT_PHASE[current]);
    }, 2600);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  return (
    <main className={styles.page}>
      <div className={styles.controls} aria-label="노드 상태 미리보기">
        <div className={styles.segmentedControl}>
          {PHASES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.segment} ${
                !isEntrancePreview && phase === item.id ? styles.segmentActive : ''
              }`}
              aria-pressed={!isEntrancePreview && phase === item.id}
              onClick={() => {
                setPhase(item.id);
                setIsPlaying(false);
                setIsEntrancePreview(false);
              }}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className={`${styles.segment} ${
              isEntrancePreview ? styles.segmentActive : ''
            }`}
            aria-pressed={isEntrancePreview}
            onClick={() => {
              setPhase('selecting');
              setIsPlaying(false);
              setIsEntrancePreview(true);
              setAnimationKey((current) => current + 1);
            }}
          >
            생성 애니메이션
          </button>
        </div>

        <button
          type="button"
          className={styles.iconButton}
          aria-label={isPlaying ? '자동 재생 일시 정지' : '자동 재생'}
          title={isPlaying ? '일시 정지' : '자동 재생'}
          onClick={() => {
            setIsPlaying((current) => {
              const next = !current;
              if (next) setIsEntrancePreview(false);
              return next;
            });
          }}
        >
          {isPlaying
            ? <Pause aria-hidden="true" />
            : <Play aria-hidden="true" />}
        </button>

        <button
          type="button"
          className={styles.iconButton}
          aria-label="처음부터 다시 보기"
          title="처음부터 다시 보기"
          onClick={() => {
            setPhase('selecting');
            setIsPlaying(true);
            setIsEntrancePreview(false);
            setAnimationKey((current) => current + 1);
          }}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>

      <section className={styles.preview} aria-live="polite">
        {isEntrancePreview ? (
          <div key={`creation-${animationKey}`} className={styles.creationScene}>
            <div className={styles.creationParent}>
              <PreviewNodeCard phase="complete" staticNode />
            </div>

            <svg
              className={styles.creationEdge}
              viewBox="0 0 100 48"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className={styles.creationEdgeActive}
                d="M 0 24 C 34 24, 66 24, 100 24"
              />
            </svg>

            <div className={styles.creationChild}>
              <div className={styles.nodeEntrance}>
                <PreviewNodeCard phase="selecting" />
              </div>
            </div>
          </div>
        ) : (
          <div key={animationKey} className={styles.nodeEntrance}>
            <PreviewNodeCard phase={phase} />
          </div>
        )}
      </section>
    </main>
  );
}
