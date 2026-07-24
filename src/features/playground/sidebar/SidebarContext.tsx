import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';

import { setCurrentSessionId } from '@/features/session/currentSession';
import type { Session } from '@/features/session/types';

import type { SidebarNode, SidebarSectionId } from './types';

type SidebarState = {
  activeSection: SidebarSectionId | null; // null = 아무 섹션도 선택 안 됨(초기 레일)
  isExpanded: boolean;
  view: 'navigation' | 'sessions';
  sessionPane: 'list' | 'create';
  expandedFolders: Set<string>;
  selectedItemId: string | null;
};

type SidebarAction =
  | { type: 'openSection'; section: SidebarSectionId }
  | { type: 'revealSessions' }
  | { type: 'openSessionCreate' }
  | { type: 'closeSessionCreate' }
  | { type: 'selectSession' }
  | { type: 'collapse' }
  | { type: 'toggleFolder'; id: string }
  | { type: 'selectItem'; id: string };

const initialState: SidebarState = {
  activeSection: null,
  isExpanded: false,
  view: 'navigation',
  sessionPane: 'list',
  expandedFolders: new Set(),
  selectedItemId: null,
};

function reducer(state: SidebarState, action: SidebarAction): SidebarState {
  switch (action.type) {
    case 'openSection':
      return { ...state, activeSection: action.section, isExpanded: true, view: 'navigation' };
    case 'revealSessions':
      return { ...state, isExpanded: true };
    case 'openSessionCreate':
      return { ...state, activeSection: null, isExpanded: true, view: 'sessions', sessionPane: 'create' };
    case 'closeSessionCreate':
      return { ...state, sessionPane: 'list' };
    case 'selectSession':
      return { ...state, activeSection: null, isExpanded: false, view: 'navigation', sessionPane: 'list' };
    case 'collapse':
      // 레일로 돌아오면 섹션 선택도 해제 (초기 상태처럼)
      return { ...state, isExpanded: false, activeSection: null, view: 'navigation', sessionPane: 'list' };
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
  openSessions: () => void;
  openSessionCreate: () => void;
  closeSessionCreate: () => void;
  selectSession: (session: Session) => void;
  collapse: () => void;
  toggleFolder: (id: string) => void;
  selectItem: (node: SidebarNode) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

type SidebarProviderProps = {
  children: ReactNode;
  /** 리프(테이블/리포트) 선택 시 호출. 향후 별도 오버레이 창 연동용. */
  onSelect?: (node: SidebarNode) => void;
  onSessionSelect?: (session: Session) => void;
  onOpenSessions?: () => void;
  initialView?: SidebarState['view'];
};

export function SidebarProvider({
  children,
  onSelect,
  onSessionSelect,
  onOpenSessions,
  initialView = 'navigation',
}: SidebarProviderProps) {
  const [state, dispatch] = useReducer(
    reducer,
    initialView,
    (view): SidebarState => ({ ...initialState, view, isExpanded: false }),
  );

  useEffect(() => {
    if (state.view !== 'sessions' || state.isExpanded) return;

    const frame = window.requestAnimationFrame(() => {
      dispatch({ type: 'revealSessions' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state.isExpanded, state.view]);

  const value = useMemo<SidebarContextValue>(
    () => ({
      ...state,
      openSection: (section) => dispatch({ type: 'openSection', section }),
      openSessions: () => onOpenSessions?.(),
      openSessionCreate: () => dispatch({ type: 'openSessionCreate' }),
      closeSessionCreate: () => dispatch({ type: 'closeSessionCreate' }),
      selectSession: (session) => {
        setCurrentSessionId(session.id);
        dispatch({ type: 'selectSession' });
        onSessionSelect?.(session);
      },
      collapse: () => dispatch({ type: 'collapse' }),
      toggleFolder: (id) => dispatch({ type: 'toggleFolder', id }),
      selectItem: (node) => {
        dispatch({ type: 'selectItem', id: node.id });
        onSelect?.(node);
      },
    }),
    [state, onOpenSessions, onSelect, onSessionSelect],
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
