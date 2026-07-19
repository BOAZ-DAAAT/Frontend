import { UserRound } from 'lucide-react';

import styles from './AccountAvatar.module.css';

type AccountAvatarProps = {
  size?: 'default' | 'compact' | 'tiny';
  imageSrc?: string;
};

export function AccountAvatar({ size = 'default', imageSrc }: AccountAvatarProps) {
  const sizeClass = size === 'compact' ? styles.compact : size === 'tiny' ? styles.tiny : '';

  return (
    <span className={`${styles.frame} ${sizeClass}`} aria-hidden="true">
      {imageSrc ? <img className={styles.image} src={imageSrc} alt="" /> : <UserRound />}
    </span>
  );
}
