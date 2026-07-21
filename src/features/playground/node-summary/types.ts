export type NodeSummaryFinding = {
  heading: string;
  rationale?: string;
  body: string;
  source_label?: string | null;
  chart_artifact_ids?: string[];
};

export type NodeSummaryAnalysisItem = {
  title: string;
  method?: string;
  purpose?: string;
  result?: string;
  key_numbers?: string[];
  interpretation?: string;
  caution?: string;
  decision?: string;
};

export type NodeSummaryDetail = {
  kind: 'sql' | 'eda' | 'analysis' | 'insight';
  [key: string]: unknown;
};

export type NodeSummary = {
  title: string;
  subtitle: string;
  background: string;
  code_used: string;
  detail: NodeSummaryDetail;
  conclusion: string;
  key_finding: string;
  source_kind: string;
  fallback_used: boolean;
};

export type AgentNodeSummaryResponse = {
  run_id: string;
  node_id: string;
  agent_name: string;
  summary_artifact_id: string;
  summary: NodeSummary;
};
