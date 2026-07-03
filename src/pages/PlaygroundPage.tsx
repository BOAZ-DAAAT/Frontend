import { PlaygroundCanvas } from '@/features/playground/components/PlaygroundCanvas';
import { SidebarProvider } from '@/features/playground/sidebar/SidebarContext';
import type { SidebarNode } from '@/features/playground/sidebar/types';
import { ModeProvider } from '@/features/playground/toolbar/ModeContext';

export function PlaygroundPage() {
  // TODO: 리프 선택 시 별도 오버레이 창 연동 예정. 지금은 로그만.
  const handleSelect = (node: SidebarNode) => {
    console.log('[sidebar] selected:', node);
  };

  return (
    <ModeProvider>
      <SidebarProvider onSelect={handleSelect}>
        <PlaygroundCanvas />
      </SidebarProvider>
    </ModeProvider>
  );
}
