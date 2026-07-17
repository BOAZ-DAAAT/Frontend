import { UserRound } from 'lucide-react';

import styles from './AccountAvatar.module.css';

type AccountAvatarProps = {
  size?: 'default' | 'compact' | 'tiny';
};

export function AccountAvatar({ size = 'default' }: AccountAvatarProps) {
  const sizeClass = size === 'compact' ? styles.compact : size === 'tiny' ? styles.tiny : '';

  return (
    <span className={`${styles.frame} ${sizeClass}`} aria-hidden="true">
      <UserRound />
    </span>
  );
}
