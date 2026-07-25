import { mockupGraph } from '@/features/playground/mockupGraph';
import { mockupArtifactUrls, mockupNodeSummaries } from '@/features/playground/mockup-data';

import { PlaygroundPage } from './PlaygroundPage';

export function MockupPage() {
  return (
    <PlaygroundPage
      initialGraph={mockupGraph}
      isolated
      reportsOverride={[]}
      nodeSummariesOverride={mockupNodeSummaries}
      artifactUrlsOverride={mockupArtifactUrls}
    />
  );
}
