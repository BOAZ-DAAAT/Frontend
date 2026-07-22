import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PlaygroundCanvas } from '@/features/playground/components/PlaygroundCanvas';
import { SidebarProvider } from '@/features/playground/sidebar/SidebarContext';
import type { SidebarNode } from '@/features/playground/sidebar/types';
import { ModeProvider } from '@/features/playground/toolbar/ModeContext';
import type { Session } from '@/features/session/types';

type PlaygroundPageProps = {
  initialView?: 'navigation' | 'sessions';
};

export function PlaygroundPage({ initialView = 'navigation' }: PlaygroundPageProps) {
  const navigate = useNavigate();
  // 열려 있는 미리보기 대상 (null = 닫힘)
  const [preview, setPreview] = useState<{ sessionId: string; table: string } | null>(null);

  // 사이드바 리프 클릭: id("table:세션ID:테이블명")를 쪼개 미리보기 열기
  const handleSelect = (node: SidebarNode) => {
    const [kind, sessionId, table] = node.id.split(':');
    if (kind === 'table' && sessionId && table) {
      setPreview({ sessionId, table });
    }
  };

  const handleSessionSelect = (_session: Session) => {
    setPreview(null);
    navigate('/playground', { replace: true });
  };

  return (
    <ModeProvider>
      <SidebarProvider
        initialView={initialView}
        onSelect={handleSelect}
        onSessionSelect={handleSessionSelect}
      >
        <PlaygroundCanvas preview={preview} onClosePreview={() => setPreview(null)} />
      </SidebarProvider>
    </ModeProvider>
  );
}
