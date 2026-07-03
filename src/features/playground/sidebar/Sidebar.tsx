import LogoIcon from '@/components/icons/DAT_temp.svg?react';

import { useSidebar } from './SidebarContext';
import { SidebarTree } from './SidebarTree';
import { sidebarSections } from './data';
import { sectionIconMap } from './iconMap';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const { activeSection, isExpanded, openSection } = useSidebar();

  return (
    <aside className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed}`}>
      <div className={styles.logo}>
        <LogoIcon className={styles.logoIcon} />
      </div>
      <div className={styles.divider} />

      <nav className={styles.sections}>
        {sidebarSections.map((section) => {
          const Icon = sectionIconMap[section.icon];
          const isActive = section.id === activeSection;

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

              {isExpanded && isActive && (
                <div className={styles.tree}>
                  <SidebarTree nodes={section.items} />
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
