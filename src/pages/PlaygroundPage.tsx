import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PlaygroundCanvas } from '@/features/playground/components/PlaygroundCanvas';
import type { PlaygroundInitialGraph } from '@/features/playground/components/PlaygroundCanvas';
import { SidebarProvider } from '@/features/playground/sidebar/SidebarContext';
import type { SidebarNode } from '@/features/playground/sidebar/types';
import type { Report } from '@/features/playground/report/reportData';
import { ModeProvider } from '@/features/playground/toolbar/ModeContext';
import type { Session } from '@/features/session/types';

type PlaygroundPageProps = {
  initialView?: 'navigation' | 'sessions';
  initialGraph?: PlaygroundInitialGraph;
  isolated?: boolean;
  reportsOverride?: Report[];
};

export function PlaygroundPage({
  initialView = 'navigation',
  initialGraph,
  isolated = false,
  reportsOverride,
}: PlaygroundPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const leaveTimerRef = useRef<number | null>(null);
  // 열려 있는 미리보기 대상 (null = 닫힘)
  const [preview, setPreview] = useState<{ sessionId: string; table: string } | null>(null);
  const [isLeavingForSessions, setIsLeavingForSessions] = useState(false);
  const [isEnteringFromSessions, setIsEnteringFromSessions] = useState(
    () => initialView === 'navigation'
      && (location.state as { fromSessions?: boolean } | null)?.fromSessions === true,
  );

  useEffect(() => {
    if (!isEnteringFromSessions) return;

    const clearEnteringState = () => {
      setIsEnteringFromSessions(false);
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        { replace: true, state: null },
      );
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      clearEnteringState();
      return;
    }

    const enterTimer = window.setTimeout(clearEnteringState, 460);
    return () => window.clearTimeout(enterTimer);
  }, [
    isEnteringFromSessions,
    location.hash,
    location.pathname,
    location.search,
    navigate,
  ]);

  useEffect(() => () => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
    }
  }, []);

  // 사이드바 리프 클릭: id("table:세션ID:테이블명")를 쪼개 미리보기 열기
  const handleSelect = (node: SidebarNode) => {
    const [kind, sessionId, table] = node.id.split(':');
    if (kind === 'table' && sessionId && table) {
      setPreview({ sessionId, table });
    }
  };

  const handleSessionSelect = (_session: Session) => {
    setPreview(null);
    navigate('/playground', {
      replace: true,
      state: { fromSessions: true },
    });
  };

  const handleOpenSessions = () => {
    if (isLeavingForSessions) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      navigate('/sessions');
      return;
    }

    setIsLeavingForSessions(true);
    leaveTimerRef.current = window.setTimeout(() => {
      navigate('/sessions');
    }, 360);
  };

  return (
    <ModeProvider>
      <SidebarProvider
        key={initialView}
        initialView={initialView}
        onSelect={handleSelect}
        onSessionSelect={handleSessionSelect}
        onOpenSessions={handleOpenSessions}
      >
        <PlaygroundCanvas
          preview={preview}
          onClosePreview={() => setPreview(null)}
          isLeavingForSessions={isLeavingForSessions}
          isEnteringFromSessions={isEnteringFromSessions}
          initialGraphOverride={initialGraph}
          isolated={isolated}
          reportsOverride={reportsOverride}
        />
      </SidebarProvider>
    </ModeProvider>
  );
}
