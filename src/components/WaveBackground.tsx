import styles from './WaveBackground.module.css';

export function WaveBackground() {
  return (
    <div className={styles.field} aria-hidden="true">
      <span className={`${styles.wave} ${styles.waveOne}`} />
      <span className={`${styles.wave} ${styles.waveTwo}`} />
      <span className={`${styles.wave} ${styles.waveThree}`} />
      <span className={`${styles.wave} ${styles.waveFour}`} />
    </div>
  );
}
