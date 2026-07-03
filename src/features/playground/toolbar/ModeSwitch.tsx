import { useMode } from './ModeContext';
import { modes } from './modes';
import styles from './ModeSwitch.module.css';

export function ModeSwitch() {
  const { mode, setMode } = useMode();

  return (
    <div className={styles.switch} role="tablist">
      {modes.map((m) => {
        const Icon = m.icon;
        const isSelected = m.id === mode;

        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={`${styles.segment} ${isSelected ? styles.selected : ''}`}
            onClick={() => setMode(m.id)}
          >
            <Icon className={styles.icon} />
            {isSelected && <span className={styles.label}>{m.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
