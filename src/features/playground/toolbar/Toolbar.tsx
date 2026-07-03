import { ModeSwitch } from './ModeSwitch';
import styles from './Toolbar.module.css';

export function Toolbar() {
  // TODO: Arrange 실제 동작 연결 예정. 지금은 플레이스홀더.
  const handleArrange = () => {
    console.log('[toolbar] arrange clicked');
  };

  return (
    <div className={styles.toolbar}>
      <ModeSwitch />
      <div className={styles.divider} />
      <button type="button" className={styles.arrange} onClick={handleArrange}>
        Arrange
      </button>
    </div>
  );
}
