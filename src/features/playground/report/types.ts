export type ReportFindingSection = {
  heading: string;
  body: string;
  source_label?: string | null;
  chart_artifact_ids: string[];
};

export type ReportEvidenceTable = {
  title: string;
  stage?: string;
  source_label?: string | null;
  rows: Record<string, unknown>[];
};

export type GeneratedReport = {
  title: string;
  executive_summary: string;
  background_and_question: string;
  methodology_narrative: string;
  code_used: string;
  key_findings: ReportFindingSection[];
  evidence_tables?: ReportEvidenceTable[];
  limitations: string[];
  conclusion_and_recommendations: string;
  key_finding: string;
  included_stages: string[];
  fallback_used: boolean;
};

export type AgentNodeReportResponse = {
  run_id: string;
  node_id: string;
  report_artifact_id: string;
  created_at: string;
  report: GeneratedReport;
};

export type AgentReportListItem = Omit<AgentNodeReportResponse, 'node_id'>;

export type AgentReportListResponse = {
  reports: AgentReportListItem[];
};
