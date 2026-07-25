import { playgroundDemoGraph } from '@/features/playground/demoGraph';
import { demoReports } from '@/features/playground/report/demoReports';

import { PlaygroundPage } from './PlaygroundPage';

export function PlaygroundTestPage() {
  return (
    <PlaygroundPage
      initialGraph={playgroundDemoGraph}
      isolated
      reportsOverride={demoReports}
    />
  );
}
