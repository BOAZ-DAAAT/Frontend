import { ModeSwitch } from './ModeSwitch';
import styles from './Toolbar.module.css';

export function Toolbar() {
  return (
    <div className={styles.toolbar}>
      <ModeSwitch />
    </div>
  );
}
