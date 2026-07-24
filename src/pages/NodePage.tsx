import { Pause, Play, RotateCcw, SquareTerminal } from 'lucide-react';
import { useEffect, useState } from 'react';

import { BlobOrb } from './BlobPage';
import styles from './NodePage.module.css';

type NodePreviewPhase = 'selecting' | 'running' | 'complete';

const PHASES: Array<{
  id: NodePreviewPhase;
  label: string;
}> = [
  { id: 'selecting', label: 'Agent 선택 중' },
  { id: 'running', label: '작업 중' },
  { id: 'complete', label: '완료' },
];

const NEXT_PHASE: Record<NodePreviewPhase, NodePreviewPhase> = {
  selecting: 'running',
  running: 'complete',
  complete: 'selecting',
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
};

export function NodePage() {
  const [phase, setPhase] = useState<NodePreviewPhase>('selecting');
  const [isPlaying, setIsPlaying] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = window.setInterval(() => {
      setPhase((current) => NEXT_PHASE[current]);
    }, 2600);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const isSelecting = phase === 'selecting';
  const showsWorkingBlob = phase !== 'complete';
  const content = isSelecting ? null : NODE_CONTENT[phase];

  return (
    <main className={styles.page}>
      <div className={styles.controls} aria-label="노드 상태 미리보기">
        <div className={styles.segmentedControl}>
          {PHASES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.segment} ${phase === item.id ? styles.segmentActive : ''}`}
              aria-pressed={phase === item.id}
              onClick={() => {
                setPhase(item.id);
                setIsPlaying(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.iconButton}
          aria-label={isPlaying ? '자동 재생 일시 정지' : '자동 재생'}
          title={isPlaying ? '일시 정지' : '자동 재생'}
          onClick={() => setIsPlaying((current) => !current)}
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
            setAnimationKey((current) => current + 1);
          }}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>

      <section className={styles.preview} aria-live="polite">
        <div key={animationKey} className={styles.nodeEntrance}>
          <div
            className={`${styles.node} ${
              isSelecting ? styles.nodeGhost : ''
            } ${phase === 'running' ? styles.nodeRunning : ''} ${
              phase === 'complete' ? styles.nodeComplete : ''
            }`}
          >
            <div className={styles.header}>
              <div className={`${styles.agentMark} ${showsWorkingBlob ? styles.agentMarkGhost : ''}`}>
                <span className={styles.orb} aria-hidden="true">
                  <BlobOrb
                    active={false}
                    motion={showsWorkingBlob ? 0.5 : 0.7}
                    speed={showsWorkingBlob ? 0.46 : 0.62}
                  />
                </span>
                {phase === 'complete'
                  ? <SquareTerminal className={styles.agentIcon} aria-hidden="true" />
                  : null}
              </div>

              <div key={phase} className={styles.title}>
                {isSelecting ? '다음 Agent 선택 중' : content?.title}
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
        </div>
      </section>
    </main>
  );
}
