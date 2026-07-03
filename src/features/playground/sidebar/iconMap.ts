import type { FunctionComponent, SVGProps } from 'react';

import DatabaseIcon from '@/components/icons/Database.svg?react';
import FolderIcon from '@/components/icons/Folder.svg?react';
import ReportIcon from '@/components/icons/Report.svg?react';
import ReportPageIcon from '@/components/icons/Report_page.svg?react';
import TableIcon from '@/components/icons/Table.svg?react';

import type { SidebarNodeIcon, SidebarSectionId } from './types';

type IconComponent = FunctionComponent<SVGProps<SVGSVGElement>>;

/** 트리 노드 아이콘 종류 → svgr 컴포넌트 */
export const nodeIconMap: Record<SidebarNodeIcon, IconComponent> = {
  folder: FolderIcon,
  table: TableIcon,
  'report-file': ReportPageIcon,
};

/** 섹션 아이콘 종류 → svgr 컴포넌트 */
export const sectionIconMap: Record<SidebarSectionId, IconComponent> = {
  database: DatabaseIcon,
  report: ReportIcon,
};
