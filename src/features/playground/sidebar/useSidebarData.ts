import { useEffect, useState } from 'react';

import { listSessionTables } from '@/features/session/api';
import { getCurrentSessionId } from '@/features/session/currentSession';

import { sidebarSections as mockSections } from './data';
import type { SidebarSection } from './types';

// 연결 단계에서 생성한 세션의 원본 사본 테이블들로 Database 섹션을 채운다
export function useSidebarData(): SidebarSection[] {
    const [sections, setSections] = useState<SidebarSection[]>(mockSections);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            // 현재 선택된 세션 id가 없으면 아직 연결 전이므로 mock 유지
            const sessionId = getCurrentSessionId();
            if (!sessionId) return;

            try {
                const { tables } = await listSessionTables(sessionId);
                if (cancelled) return;

                // "원본 데이터" 폴더 하나에 현재 세션의 원본 사본 테이블 전부
                const items = [
                    {
                        id: `session:${sessionId}`,
                        label: '원본 데이터',
                        icon: 'folder' as const,
                        children: tables.map((table) => ({
                            id: `table:${sessionId}:${table}`,
                            label: table,
                            icon: 'table' as const,
                        })),
                    },
                ];

                setSections((prev) =>
                    prev.map((s) => (s.id === 'database' ? { ...s, items } : s)),
                );
            } catch {
                // 백엔드 미기동 등 실패 시 mock 유지
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    return sections;
}
