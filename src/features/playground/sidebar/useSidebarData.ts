import { useEffect, useState } from 'react';

import { listLocalTables } from '@/features/datasources/api';

import { sidebarSections as mockSections } from './data';
import type { SidebarSection } from './types';

// 연결 단계에서 적재한 "세션 DB"의 테이블들로 Database 섹션을 채운다
export function useSidebarData(): SidebarSection[] {
    const [sections, setSections] = useState<SidebarSection[]>(mockSections);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            // 적재 때 기록해둔 이번 세션의 DB 이름 (없으면 = 아직 연결 안 함 → mock 유지)
            const sessionDb = localStorage.getItem('daaat.sessionDb');
            if (!sessionDb) return;

            try {
                const { tables } = await listLocalTables(sessionDb);
                if (cancelled) return;

                // "원본 데이터" 폴더 하나에 세션 DB의 테이블 전부
                const items = [
                    {
                        id: `db:${sessionDb}`,
                        label: '원본 데이터',
                        icon: 'folder' as const,
                        children: tables.map((table) => ({
                            id: `table:${sessionDb}:${table}`,
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