import { useEffect, useState, type TransitionEvent } from 'react';

import { AccountAvatar } from '@/features/playground/account/AccountAvatar';
import sidebarProfileImage from '@/features/playground/account/assets/sidebar-profile.png';

import { useSidebar } from './SidebarContext';
import { SidebarTree } from './SidebarTree';
import { SessionSidebar } from './session/SessionSidebar';
import { useSidebarData } from './useSidebarData';
import { sectionIconMap } from './iconMap';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const {
    activeSection,
    isExpanded,
    openSection,
    openSessions,
    openSessionCreate,
    selectSession,
    view,
  } = useSidebar();
  const sidebarSections = useSidebarData();
  const isSessionView = view === 'sessions';
  const [isSessionContentReady, setIsSessionContentReady] = useState(false);

  useEffect(() => {
    if (!isSessionView || !isExpanded) {
      setIsSessionContentReady(false);
      return;
    }

    const fallback = window.setTimeout(() => {
      setIsSessionContentReady(true);
    }, 340);

    return () => window.clearTimeout(fallback);
  }, [isExpanded, isSessionView]);

  const handleWidthTransitionEnd = (event: TransitionEvent<HTMLElement>) => {
    if (
      event.target === event.currentTarget
      && event.propertyName === 'width'
      && isSessionView
      && isExpanded
    ) {
      setIsSessionContentReady(true);
    }
  };

  return (
    <aside
      className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed} ${
        isSessionView ? styles.sessionMode : ''
      }`}
      onTransitionEnd={handleWidthTransitionEnd}
    >
      <button
        type="button"
        className={styles.logo}
        onClick={openSessions}
        aria-label="세션 선택 열기"
        aria-pressed={isSessionView}
      >
        <AccountAvatar size="compact" imageSrc={sidebarProfileImage} />
      </button>
      <div className={styles.divider} />

      {isSessionView ? (
        <div
          className={`${styles.sessionContent} ${
            isSessionContentReady ? styles.sessionContentReady : ''
          }`}
          aria-hidden={!isSessionContentReady}
        >
          <SessionSidebar onCreateSession={openSessionCreate} onSelectSession={selectSession} />
        </div>
      ) : (
        <nav className={styles.sections}>
          {sidebarSections.map((section) => {
            const Icon = sectionIconMap[section.icon];
            const isActive = section.id === activeSection;
            const isTreeOpen = isExpanded && isActive;

            return (
              <div key={section.id} className={styles.section}>
                <button
                  type="button"
                  className={`${styles.sectionHeader} ${isActive ? styles.sectionActive : ''}`}
                  onClick={() => openSection(section.id)}
                >
                  <Icon className={styles.sectionIcon} />
                  {isExpanded && <span className={styles.sectionLabel}>{section.label}</span>}
                </button>

                <div
                  className={`${styles.tree} ${isTreeOpen ? styles.treeOpen : ''}`}
                  aria-hidden={!isTreeOpen}
                >
                  <div className={styles.treeInner}>
                    <SidebarTree nodes={section.items} />
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
