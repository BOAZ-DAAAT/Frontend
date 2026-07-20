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
          { id: 'db-raw-t1', label: '매물 원천 테이블', icon: 'table' },
          { id: 'db-raw-t2', label: '생활 인프라 테이블', icon: 'table' },
          { id: 'db-raw-t3', label: '행정동 인구 테이블', icon: 'table' },
        ],
      },
      {
        id: 'db-mart-1',
        label: '주거 인프라 마트',
        icon: 'folder',
        children: [
          { id: 'db-mart-1-a', label: '행정동별 인프라 지수', icon: 'table' },
          { id: 'db-mart-1-b', label: '페르소나 추천 점수', icon: 'table' },
        ],
      },
      {
        id: 'db-mart-2',
        label: '배송 리스크 마트',
        icon: 'folder',
        children: [{ id: 'db-mart-2-a', label: '주문별 예측 손실액', icon: 'table' }],
      },
      {
        id: 'db-mart-3',
        label: '모델 결과',
        icon: 'folder',
        children: [
          { id: 'db-mart-3-a', label: '변수 중요도', icon: 'table' },
          { id: 'db-mart-3-b', label: '추천 후보 Top N', icon: 'table' },
        ],
      },
    ],
  },
  {
    id: 'report',
    label: 'Report',
    icon: 'report',
    items: [
      {
        id: 'rp-sales',
        label: '주거 인프라 종합 리포트',
        icon: 'report-file',
        meta: '2026.07.19',
      },
      { id: 'rp-mart-1', label: '인프라 지수 산출 결과', icon: 'report-file' },
      { id: 'rp-mart-2', label: '페르소나 추천 결과', icon: 'report-file' },
      { id: 'rp-mart-3', label: '취약 지역 개선 우선순위', icon: 'report-file' },
    ],
  },
];
