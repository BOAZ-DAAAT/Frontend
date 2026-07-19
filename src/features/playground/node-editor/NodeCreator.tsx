import {
  ChartNoAxesCombined,
  Lightbulb,
  Plus,
  ScanSearch,
  SquareTerminal,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import type { PlaygroundNodeKind } from '../types';

import styles from './NodeCreator.module.css';

export type CreatableNodeKind = Exclude<PlaygroundNodeKind, 'datasource'>;

type NodeCreatorProps = {
  onCreate: (kind: CreatableNodeKind) => void;
};

type NodeOption = {
  kind: CreatableNodeKind;
  label: string;
  icon: LucideIcon;
};

const NODE_OPTIONS: NodeOption[] = [
  { kind: 'sql-agent', label: 'SQL Agent', icon: SquareTerminal },
  { kind: 'EDA-agent', label: 'EDA Agent', icon: ChartNoAxesCombined },
  { kind: 'analysis-agent', label: 'Analysis Agent', icon: ScanSearch },
  { kind: 'insight-agent', label: 'Insight Agent', icon: Lightbulb },
];

export function NodeCreator({ onCreate }: NodeCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const createNode = (kind: CreatableNodeKind) => {
    onCreate(kind);
    setIsOpen(false);
  };

  return (
    <div className={styles.creator}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="새 노드 추가"
        aria-expanded={isOpen}
        title="새 노드 추가"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Plus aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className={styles.menu} role="menu" aria-label="새 노드 종류">
          {NODE_OPTIONS.map(({ kind, label, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              className={styles.option}
              role="menuitem"
              onClick={() => createNode(kind)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
