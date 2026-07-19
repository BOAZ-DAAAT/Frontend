import { AccountAvatar } from './AccountAvatar';
import accountProfileTwo from './assets/account-profile-2.png';
import sidebarProfileImage from './assets/sidebar-profile.png';

import styles from './AccountStack.module.css';

const VISIBLE_ACCOUNTS = 3;

export function AccountStack() {
  return (
    <button type="button" className={styles.stack} aria-label="공동 작업자 계정 3명" title="계정">
      {Array.from({ length: VISIBLE_ACCOUNTS }, (_, index) => (
        <span key={index} className={styles.avatarItem}>
          <AccountAvatar
            imageSrc={
              index === 1
                ? accountProfileTwo
                : index === VISIBLE_ACCOUNTS - 1
                  ? sidebarProfileImage
                  : undefined
            }
          />
        </span>
      ))}
    </button>
  );
}
