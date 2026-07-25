import artifactFiles from './mockup-data/assets.json';
import summaries from './mockup-data/summaries.json';
import type { NodeSummary } from './node-summary/types';

export const mockupNodeSummaries = summaries as Record<string, NodeSummary>;

export const mockupArtifactUrls = Object.fromEntries(
  Object.entries(artifactFiles).map(([artifactId, filename]) => [
    artifactId,
    `${import.meta.env.BASE_URL}mockup-artifacts/${filename}`,
  ]),
) as Record<string, string>;
