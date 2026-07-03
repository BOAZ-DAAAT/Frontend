import { useSidebar } from './SidebarContext';
import { nodeIconMap } from './iconMap';
import type { SidebarNode } from './types';
import styles from './SidebarTree.module.css';

type SidebarTreeProps = {
  nodes: SidebarNode[];
};

export function SidebarTree({ nodes }: SidebarTreeProps) {
  return (
    <ul className={styles.tree}>
      {nodes.map((node) => (
        <SidebarTreeItem key={node.id} node={node} />
      ))}
    </ul>
  );
}

function SidebarTreeItem({ node }: { node: SidebarNode }) {
  const { expandedFolders, selectedItemId, toggleFolder, selectItem } = useSidebar();

  const Icon = nodeIconMap[node.icon];
  const isFolder = Boolean(node.children?.length);
  const isOpen = expandedFolders.has(node.id);
  const isSelected = selectedItemId === node.id;

  const handleClick = () => {
    if (isFolder) {
      toggleFolder(node.id);
    } else {
      selectItem(node);
    }
  };

  return (
    <li className={styles.item}>
      <button
        type="button"
        className={`${styles.row} ${isSelected ? styles.selected : ''}`}
        onClick={handleClick}
        aria-expanded={isFolder ? isOpen : undefined}
      >
        <Icon className={styles.icon} />
        <span className={styles.text}>
          <span className={styles.label}>{node.label}</span>
          {node.meta && <span className={styles.meta}>{node.meta}</span>}
        </span>
      </button>

      {isFolder && isOpen && node.children && (
        <SidebarTree nodes={node.children} />
      )}
    </li>
  );
}
