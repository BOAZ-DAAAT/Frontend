import { Clock3, FileText, Plus, Workflow } from 'lucide-react';

import { AccountAvatar } from '@/features/playground/account/AccountAvatar';

import styles from './SessionSidebar.module.css';

const VISIBLE_MEMBERS = 3;
const ADDITIONAL_MEMBERS = 3;

type SessionSidebarProps = {
  nodeCount?: number;
  reportCount?: number;
};

export function SessionSidebar({ nodeCount = 2, reportCount = 4 }: SessionSidebarProps) {
  return (
    <div className={styles.content}>
      <article className={styles.card}>
        <div className={styles.stats}>
          <span className={styles.statChip} aria-label={`노드 ${nodeCount}개`}>
            <Workflow aria-hidden="true" />
            <span>{nodeCount}</span>
          </span>
          <span className={styles.statChip} aria-label={`리포트 ${reportCount}개`}>
            <FileText aria-hidden="true" />
            <span>{reportCount}</span>
          </span>
        </div>

        <div className={styles.details}>
          <h2 className={styles.sessionName}>Contents Layout</h2>
          <p className={styles.host}>Host : ity0526</p>
        </div>

        <div className={styles.cardDivider} />

        <footer className={styles.metaRow}>
          <div className={styles.members} aria-label="초대된 사용자 6명">
            <div className={styles.avatarStack}>
              {Array.from({ length: VISIBLE_MEMBERS }, (_, index) => (
                <span key={index} className={styles.avatarItem}>
                  <AccountAvatar size="tiny" />
                </span>
              ))}
            </div>
            <span className={styles.additionalMembers}>+{ADDITIONAL_MEMBERS}</span>
          </div>

          <span className={styles.recentChip}>
            <Clock3 aria-hidden="true" />
            <span>5 August</span>
          </span>
        </footer>
      </article>

      <button type="button" className={styles.addButton}>
        <Plus aria-hidden="true" />
        <span>Add Session</span>
      </button>
    </div>
  );
}
