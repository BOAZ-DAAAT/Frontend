import { useEffect, useState } from 'react';

import { listSessionTables } from '@/features/session/api';
import { getCurrentSessionId } from '@/features/session/currentSession';
import { listAgentReports } from '@/features/playground/report/api';
import { setCachedReports } from '@/features/playground/report/reportCache';
import { toUiReport } from '@/features/playground/report/reportAdapter';
import { REPORTS_UPDATED_EVENT } from '@/features/playground/report/reportEvents';
import type { Report } from '@/features/playground/report/reportData';

import { sidebarSections as mockSections } from './data';
import type { SidebarSection } from './types';

// 연결 단계에서 생성한 세션의 원본 사본 테이블들로 Database 섹션을 채운다
function withReportOverride(reportsOverride?: Report[]): SidebarSection[] {
    if (!reportsOverride) return mockSections;

    return mockSections.map((section) => {
        if (section.id !== 'report') return section;
        return {
            ...section,
            items: reportsOverride.map((report) => ({
                id: report.id,
                label: report.title,
                icon: 'report-file' as const,
                meta: report.date,
            })),
        };
    });
}

export function useSidebarData(reportsOverride?: Report[]): SidebarSection[] {
    const [sections, setSections] = useState<SidebarSection[]>(
        () => withReportOverride(reportsOverride),
    );

    useEffect(() => {
        if (reportsOverride) {
            setSections(withReportOverride(reportsOverride));
            return;
        }

        let cancelled = false;

        async function load() {
            // 현재 선택된 세션 id가 없으면 아직 연결 전이므로 mock 유지
            const sessionId = getCurrentSessionId();
            if (!sessionId) return;

            try {
                const [{ tables }, reportResponse] = await Promise.all([
                    listSessionTables(sessionId),
                    listAgentReports(sessionId),
                ]);
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

                const reports = reportResponse.reports.map(toUiReport);
                setCachedReports(sessionId, reports);

                const reportItems = reports.map((report) => {
                    return {
                        id: report.id,
                        label: report.title,
                        icon: 'report-file' as const,
                        meta: report.date,
                    };
                });

                setSections((prev) => prev.map((section) => {
                    if (section.id === 'database') return { ...section, items };
                    if (section.id === 'report') return { ...section, items: reportItems };
                    return section;
                }));
            } catch {
                // 백엔드 미기동 등 실패 시 mock 유지
            }
        }

        load();
        window.addEventListener(REPORTS_UPDATED_EVENT, load);
        return () => {
            cancelled = true;
            window.removeEventListener(REPORTS_UPDATED_EVENT, load);
        };
    }, [reportsOverride]);

    return sections;
}
