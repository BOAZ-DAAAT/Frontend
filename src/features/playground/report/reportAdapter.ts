import type { Report } from './reportData';
import type { AgentReportListItem, GeneratedReport } from './types';

function section(title: string, content: string) {
  return content.trim() ? `## ${title}\n\n${content.trim()}` : '';
}

function reportMarkdown(report: GeneratedReport) {
  const findings = report.key_findings.map((finding) => (
    `### ${finding.heading}\n\n${finding.body}`
  )).join('\n\n');
  const limitations = report.limitations.map((item) => `- ${item}`).join('\n');
  const code = report.code_used.trim()
    ? `## 사용한 SQL\n\n\`\`\`sql\n${report.code_used.trim()}\n\`\`\``
    : '';

  return [
    section('핵심 요약', report.executive_summary),
    section('배경 및 질문', report.background_and_question),
    section('방법론', report.methodology_narrative),
    section('본 분석', findings),
    code,
    section('한계 및 유의사항', limitations),
    section('결론 및 제언', report.conclusion_and_recommendations),
  ].filter(Boolean).join('\n\n');
}

function formatDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt.slice(0, 10);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function toUiReport(item: AgentReportListItem): Report {
  return {
    id: `report:${item.report_artifact_id}`,
    title: item.report.title,
    author: 'Report Agent',
    date: formatDate(item.created_at),
    markdown: reportMarkdown(item.report),
    runId: item.run_id,
    generated: item.report,
  };
}
