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
    openSessionCreate,
    selectSession,
    toggleSessions,
    view,
  } = useSidebar();
  const sidebarSections = useSidebarData();
  const isSessionView = view === 'sessions';

  return (
    <aside
      className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed} ${
        isSessionView ? styles.sessionMode : ''
      }`}
    >
      <button
        type="button"
        className={styles.logo}
        onClick={toggleSessions}
        aria-label={isSessionView ? '세션 선택 닫기' : '세션 선택 열기'}
        aria-pressed={isSessionView}
      >
        <AccountAvatar size="compact" imageSrc={sidebarProfileImage} />
      </button>
      <div className={styles.divider} />

      {isSessionView ? (
        <SessionSidebar onCreateSession={openSessionCreate} onSelectSession={selectSession} />
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
