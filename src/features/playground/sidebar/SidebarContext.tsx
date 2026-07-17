import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import type { SidebarNode, SidebarSectionId } from './types';

type SidebarState = {
  activeSection: SidebarSectionId | null; // null = 아무 섹션도 선택 안 됨(초기 레일)
  isExpanded: boolean;
  view: 'navigation' | 'sessions';
  expandedFolders: Set<string>;
  selectedItemId: string | null;
};

type SidebarAction =
  | { type: 'openSection'; section: SidebarSectionId }
  | { type: 'toggleSessions' }
  | { type: 'collapse' }
  | { type: 'toggleFolder'; id: string }
  | { type: 'selectItem'; id: string };

const initialState: SidebarState = {
  activeSection: null,
  isExpanded: false,
  view: 'navigation',
  expandedFolders: new Set(),
  selectedItemId: null,
};

function reducer(state: SidebarState, action: SidebarAction): SidebarState {
  switch (action.type) {
    case 'openSection':
      return { ...state, activeSection: action.section, isExpanded: true, view: 'navigation' };
    case 'toggleSessions':
      if (state.view === 'sessions') {
        return { ...state, activeSection: null, isExpanded: false, view: 'navigation' };
      }
      return { ...state, activeSection: null, isExpanded: true, view: 'sessions' };
    case 'collapse':
      // 레일로 돌아오면 섹션 선택도 해제 (초기 상태처럼)
      return { ...state, isExpanded: false, activeSection: null, view: 'navigation' };
    case 'toggleFolder': {
      const next = new Set(state.expandedFolders);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, expandedFolders: next };
    }
    case 'selectItem':
      return { ...state, selectedItemId: action.id };
    default:
      return state;
  }
}

type SidebarContextValue = SidebarState & {
  openSection: (section: SidebarSectionId) => void;
  toggleSessions: () => void;
  collapse: () => void;
  toggleFolder: (id: string) => void;
  selectItem: (node: SidebarNode) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

type SidebarProviderProps = {
  children: ReactNode;
  /** 리프(테이블/리포트) 선택 시 호출. 향후 별도 오버레이 창 연동용. */
  onSelect?: (node: SidebarNode) => void;
};

export function SidebarProvider({ children, onSelect }: SidebarProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<SidebarContextValue>(
    () => ({
      ...state,
      openSection: (section) => dispatch({ type: 'openSection', section }),
      toggleSessions: () => dispatch({ type: 'toggleSessions' }),
      collapse: () => dispatch({ type: 'collapse' }),
      toggleFolder: (id) => dispatch({ type: 'toggleFolder', id }),
      selectItem: (node) => {
        dispatch({ type: 'selectItem', id: node.id });
        onSelect?.(node);
      },
    }),
    [state, onSelect],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return ctx;
}
