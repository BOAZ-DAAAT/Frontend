import { useMode, type PlaygroundMode } from './ModeContext';
import { ModeSwitch } from './ModeSwitch';
import styles from './Toolbar.module.css';

const MODE_DESCRIPTIONS: Record<PlaygroundMode, string> = {
  analyze: '노드별로 실행 흐름을 확인하고 분기하며 분석을 수행할 수 있는 공간입니다.',
  report: '원하는 분기의 인사이트 노드를 선택하면 최종 레포트를 산출할 수 있습니다.',
};

export function Toolbar() {
  const { mode } = useMode();

  return (
    <div className={styles.toolbarWrap}>
      <div className={styles.toolbar}>
        <ModeSwitch />
      </div>
      <p key={mode} className={styles.modeDescription}>
        {MODE_DESCRIPTIONS[mode]}
      </p>
    </div>
  );
}
