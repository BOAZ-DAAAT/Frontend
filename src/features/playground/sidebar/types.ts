export type SidebarSectionId = 'database' | 'report';

export type SidebarNodeIcon = 'folder' | 'table' | 'report-file';

/** 재귀 트리 노드. children이 있으면 폴더(확장 가능), 없으면 리프. */
export type SidebarNode = {
  id: string;
  label: string;
  icon: SidebarNodeIcon;
  meta?: string; // 예: 매출 리포트의 '2026.06.20'
  children?: SidebarNode[];
};

export type SidebarSection = {
  id: SidebarSectionId;
  label: string;
  icon: SidebarSectionId; // 섹션 아이콘 종류 (database | report)
  items: SidebarNode[];
};
