import { useState } from 'react';

import { PlaygroundCanvas } from '@/features/playground/components/PlaygroundCanvas';
import { TablePreviewPanel } from '@/features/playground/components/TablePreviewPanel';
import { SidebarProvider } from '@/features/playground/sidebar/SidebarContext';
import type { SidebarNode } from '@/features/playground/sidebar/types';
import { ModeProvider } from '@/features/playground/toolbar/ModeContext';

export function PlaygroundPage() {
  // 열려 있는 미리보기 대상 (null = 닫힘)
  const [preview, setPreview] = useState<{ db: string; table: string } | null>(null);

  // 사이드바 리프 클릭: id("table:DB명:테이블명")를 쪼개 미리보기 열기
  const handleSelect = (node: SidebarNode) => {
    const [kind, db, table] = node.id.split(':');
    if (kind === 'table' && db && table) {
      setPreview({ db, table });
    }
  };

  return (
    <ModeProvider>
      <SidebarProvider onSelect={handleSelect}>
        <PlaygroundCanvas />
        {preview && (
          <TablePreviewPanel
            database={preview.db}
            table={preview.table}
            onClose={() => setPreview(null)}
          />
        )}
      </SidebarProvider>
    </ModeProvider>
  );
}
