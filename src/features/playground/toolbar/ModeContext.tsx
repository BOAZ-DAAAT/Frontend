import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type PlaygroundMode = 'analyze' | 'report';

type ModeContextValue = {
  mode: PlaygroundMode;
  setMode: (mode: PlaygroundMode) => void;
};

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PlaygroundMode>('analyze');

  const value = useMemo<ModeContextValue>(() => ({ mode, setMode }), [mode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error('useMode must be used within ModeProvider');
  }
  return ctx;
}
