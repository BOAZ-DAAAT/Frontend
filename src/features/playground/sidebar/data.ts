import type { SidebarSection } from './types';

/** 사이드바 mock 데이터 (백엔드 연동 전 임시). */
export const sidebarSections: SidebarSection[] = [
  {
    id: 'database',
    label: 'Database',
    icon: 'database',
    items: [
      {
        id: 'db-raw',
        label: '원본 데이터',
        icon: 'folder',
        children: [
          { id: 'db-raw-t1', label: '테이블 1', icon: 'table' },
          { id: 'db-raw-t2', label: '테이블 2', icon: 'table' },
          { id: 'db-raw-t3', label: '테이블 3', icon: 'table' },
        ],
      },
      {
        id: 'db-mart-1',
        label: '데이터 마트 1',
        icon: 'folder',
        children: [
          { id: 'db-mart-1-a', label: '테이블 A', icon: 'table' },
          { id: 'db-mart-1-b', label: '테이블 B', icon: 'table' },
        ],
      },
      {
        id: 'db-mart-2',
        label: '데이터 마트 2',
        icon: 'folder',
        children: [{ id: 'db-mart-2-a', label: '테이블 C', icon: 'table' }],
      },
      {
        id: 'db-mart-3',
        label: '데이터 마트 3',
        icon: 'folder',
        children: [
          { id: 'db-mart-3-a', label: '테이블 D', icon: 'table' },
          { id: 'db-mart-3-b', label: '테이블 E', icon: 'table' },
        ],
      },
    ],
  },
  {
    id: 'report',
    label: 'Report',
    icon: 'report',
    items: [
      { id: 'rp-sales', label: '매출 리포트', icon: 'report-file', meta: '2026.06.20' },
      { id: 'rp-mart-1', label: '데이터 마트 1', icon: 'report-file' },
      { id: 'rp-mart-2', label: '데이터 마트 2', icon: 'report-file' },
      { id: 'rp-mart-3', label: '데이터 마트 3', icon: 'report-file' },
    ],
  },
];
