import type { FunctionComponent, SVGProps } from 'react';

import AnalyzeIcon from '@/components/icons/Analyze.svg?react';
import ReportPageIcon from '@/components/icons/Report_page.svg?react';

import type { PlaygroundMode } from './ModeContext';

type IconComponent = FunctionComponent<SVGProps<SVGSVGElement>>;

export type ModeConfig = {
  id: PlaygroundMode;
  label: string;
  icon: IconComponent;
};

export const modes: ModeConfig[] = [
  { id: 'analyze', label: 'Analyze', icon: AnalyzeIcon },
  { id: 'report', label: 'Report', icon: ReportPageIcon },
];
