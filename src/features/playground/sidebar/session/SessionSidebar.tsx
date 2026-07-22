import { Clock3, FileText, Plus, Workflow } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AccountAvatar } from '@/features/playground/account/AccountAvatar';
import accountProfileTwo from '@/features/playground/account/assets/account-profile-2.png';
import sidebarProfileImage from '@/features/playground/account/assets/sidebar-profile.png';
import { listSessions } from '@/features/session/api';
import { getCurrentSessionId } from '@/features/session/currentSession';
import type { Session } from '@/features/session/types';

import styles from './SessionSidebar.module.css';

const VISIBLE_MEMBERS = 3;
const ADDITIONAL_MEMBERS = 3;

type SessionSidebarProps = {
  onCreateSession: () => void;
  onSelectSession: (session: Session) => void;
};

function formatDate(value: string | null) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long' }).format(date);
}

export function SessionSidebar({ onCreateSession, onSelectSession }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentSessionId = getCurrentSessionId();

  useEffect(() => {
    let cancelled = false;

    listSessions()
      .then(({ sessions: nextSessions }) => {
        if (!cancelled) setSessions(nextSessions);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '세션 목록을 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className={styles.content}>
      {isLoading ? <p className={styles.status}>세션을 불러오는 중...</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {!isLoading && !error && sessions.length === 0 ? (
        <p className={styles.status}>아직 생성된 세션이 없습니다.</p>
      ) : null}

      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          className={`${styles.card} ${session.id === currentSessionId ? styles.currentCard : ''}`}
          onClick={() => onSelectSession(session)}
        >
          <div className={styles.stats}>
            <span className={styles.statChip} aria-label="노드">
              <Workflow aria-hidden="true" />
              <span>2</span>
            </span>
            <span className={styles.statChip} aria-label="리포트">
              <FileText aria-hidden="true" />
              <span>4</span>
            </span>
          </div>

          <div className={styles.details}>
            <h2 className={styles.sessionName}>{session.title}</h2>
            <p className={styles.host}>Host : {session.username}</p>
          </div>

          <div className={styles.cardDivider} />

          <span className={styles.metaRow}>
            <span className={styles.members} aria-label="세션 참여자">
              <span className={styles.avatarStack}>
                {Array.from({ length: VISIBLE_MEMBERS }, (_, index) => (
                  <span key={index} className={styles.avatarItem}>
                    <AccountAvatar
                      size="tiny"
                      imageSrc={
                        index === 1
                          ? accountProfileTwo
                          : index === VISIBLE_MEMBERS - 1
                            ? sidebarProfileImage
                            : undefined
                      }
                    />
                  </span>
                ))}
              </span>
              <span className={styles.additionalMembers}>+{ADDITIONAL_MEMBERS}</span>
            </span>

            <span className={styles.recentChip}>
              <Clock3 aria-hidden="true" />
              <span>{formatDate(session.last_opened_at ?? session.updated_at)}</span>
            </span>
          </span>
        </button>
      ))}

      <button type="button" className={styles.addButton} onClick={onCreateSession}>
        <Plus aria-hidden="true" />
        <span>Add Session</span>
      </button>
    </div>
  );
}
