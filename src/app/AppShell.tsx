import { Outlet } from 'react-router-dom';

import { WaveBackground } from '@/components/WaveBackground';

import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <div className={styles.shell}>
      <div className={styles.background}>
        <WaveBackground />
      </div>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
