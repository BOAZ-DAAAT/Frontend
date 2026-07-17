import { AccountAvatar } from './AccountAvatar';

import styles from './AccountStack.module.css';

const VISIBLE_ACCOUNTS = 3;

export function AccountStack() {
  return (
    <button type="button" className={styles.stack} aria-label="공동 작업자 계정 3명" title="계정">
      {Array.from({ length: VISIBLE_ACCOUNTS }, (_, index) => (
        <span key={index} className={styles.avatarItem}>
          <AccountAvatar />
        </span>
      ))}
    </button>
  );
}
