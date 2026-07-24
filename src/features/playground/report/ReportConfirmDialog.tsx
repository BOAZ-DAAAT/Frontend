import styles from './ReportConfirmDialog.module.css';

type Props = {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ReportConfirmDialog({ label, onConfirm, onCancel }: Props) {
  return (
    <section className={styles.overlay} aria-label="리포트 생성 확인">
      <button type="button" className={styles.backdrop} onClick={onCancel} aria-label="취소" />
      <div className={styles.dialog} role="alertdialog" aria-modal="true">
        <p className={styles.question}>레포트를 산출하시겠습니까?</p>
        <p className={styles.target}>{label}</p>
        <div className={styles.actions}>
          <button type="button" className={`${styles.button} ${styles.confirm}`} onClick={onConfirm}>
            예
          </button>
          <button type="button" className={`${styles.button} ${styles.cancel}`} onClick={onCancel}>
            아니오
          </button>
        </div>
      </div>
    </section>
  );
}
