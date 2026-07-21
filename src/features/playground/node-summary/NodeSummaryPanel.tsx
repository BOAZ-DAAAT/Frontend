import { PromptComposer } from '@/features/playground/composer/PromptComposer';
import {
  AlertCircle,
  ChartNoAxesCombined,
  Database,
  Lightbulb,
  LoaderCircle,
  ScanSearch,
  SquareTerminal,
  type LucideIcon,
} from 'lucide-react';
import { ReportCard } from '@/features/playground/report/ReportCard';
import type { Report } from '@/features/playground/report/reportData';
import type { PlaygroundNodeKind } from '@/features/playground/types';

import type { NodeSummary, NodeSummaryFinding } from './types';
import styles from './NodeSummaryPanel.module.css';

type NodeSummaryPanelProps = {
  node: {
    id: string;
    label: string;
    kind: PlaygroundNodeKind;
    status: 'idle' | 'running' | 'waiting' | 'success' | 'error';
  };
  summary: NodeSummary | null;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onBranchPromptSend: (prompt: string) => Promise<void>;
};

const NODE_ICONS: Record<PlaygroundNodeKind, LucideIcon> = {
  datasource: Database,
  'sql-agent': SquareTerminal,
  'EDA-agent': ChartNoAxesCombined,
  'analysis-agent': ScanSearch,
  'insight-agent': Lightbulb,
};

const DETAIL_LABELS: Record<string, string> = {
  source_tables: '원본 테이블',
  integrity_checks: '정합성 확인',
  derived_columns: '파생 컬럼',
  mart_grain: '데이터 단위',
  mart_columns: '데이터 마트 컬럼',
  mart_preview: '데이터 미리보기',
  sql_snippet: '실행 SQL',
  data_profile: '데이터 프로파일',
  quality_issues: '데이터 품질',
  statistical_findings: '통계적 발견',
  hypotheses: '가설',
  primary_hypothesis: '핵심 가설',
  charts_generated: '생성된 차트',
  method_decision: '분석 방법',
  hypothesis_tests: '가설 검정',
  key_statistics: '핵심 통계',
  limitations: '한계',
  answer: '핵심 답변',
  key_insights: '핵심 인사이트',
  action_plan: '실행 제안',
  evidence_sources: '근거 출처',
  supporting_charts: '근거 차트',
};

function isFinding(value: unknown): value is NodeSummaryFinding {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<NodeSummaryFinding>;
  return typeof candidate.heading === 'string' && typeof candidate.body === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function PreviewTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return (
    <div className={styles.tableWrap}>
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => <td key={column}>{String(row[column] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number') {
    return <p>{String(value)}</p>;
  }
  if (typeof value === 'boolean') return <p>{value ? '예' : '아니요'}</p>;
  if (Array.isArray(value)) {
    if (!value.length) return null;
    if (value.every(isRecord) && !value.some(isFinding)) {
      return <PreviewTable rows={value} />;
    }
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>
            {isFinding(item) ? (
              <div className={styles.finding}>
                <strong>{item.heading}</strong>
                {item.source_label ? <span>{item.source_label}</span> : null}
                <p>{item.body}</p>
              </div>
            ) : isRecord(item) ? <SummaryObject value={item} /> : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (isRecord(value)) return <SummaryObject value={value} />;
  return null;
}

function SummaryObject({ value }: { value: Record<string, unknown> }) {
  return (
    <dl className={styles.objectList}>
      {Object.entries(value).map(([key, item]) => {
        if (item === null || item === '' || (Array.isArray(item) && item.length === 0)) return null;
        return (
          <div key={key}>
            <dt>{DETAIL_LABELS[key] ?? key.replace(/_/g, ' ')}</dt>
            <dd><SummaryValue value={item} /></dd>
          </div>
        );
      })}
    </dl>
  );
}

function SummaryDocument({ summary }: { summary: NodeSummary }) {
  const detailEntries = Object.entries(summary.detail).filter(([key]) => key !== 'kind');
  return (
    <div className={styles.document}>
      <header className={styles.documentHeader}>
        <span className={styles.kind}>{summary.detail.kind.toUpperCase()}</span>
        <h2>{summary.title}</h2>
        <p className={styles.subtitle}>{summary.subtitle}</p>
      </header>

      <section>
        <h3>분석 배경</h3>
        <p>{summary.background}</p>
      </section>

      {detailEntries.map(([key, value]) => (
        <section key={key}>
          <h3>{DETAIL_LABELS[key] ?? key.replace(/_/g, ' ')}</h3>
          <SummaryValue value={value} />
        </section>
      ))}

      {summary.code_used ? (
        <section>
          <h3>사용한 코드</h3>
          <pre><code>{summary.code_used}</code></pre>
        </section>
      ) : null}

      <section className={styles.conclusion}>
        <h3>결론</h3>
        <p>{summary.conclusion}</p>
      </section>
    </div>
  );
}

function SummaryState({ node, error, isLoading }: Pick<NodeSummaryPanelProps, 'node' | 'error' | 'isLoading'>) {
  if (isLoading) {
    return (
      <div className={styles.state} role="status">
        <LoaderCircle className={styles.spinner} aria-hidden="true" />
        <p>서머리를 불러오는 중입니다.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.state} role="alert">
        <AlertCircle aria-hidden="true" />
        <p>{error}</p>
      </div>
    );
  }
  const message = node.status === 'running' || node.status === 'waiting'
    ? '작업이 완료되면 상세 서머리를 확인할 수 있습니다.'
    : node.status === 'error'
      ? '실패한 노드에는 완료 서머리가 없습니다.'
      : '상세 서머리가 없는 노드입니다.';
  return <div className={styles.state}><p>{message}</p></div>;
}

export function NodeSummaryPanel({
  node,
  summary,
  error,
  isLoading,
  onClose,
  onBranchPromptSend,
}: NodeSummaryPanelProps) {
  const NodeIcon = NODE_ICONS[node.kind];
  const report: Report = {
    id: `node-summary-${node.id}`,
    title: summary?.title ?? node.label,
    author: '',
    date: '',
    markdown: '',
  };

  return (
    <aside className={styles.panel} aria-label={`${node.label} 서머리`}>
      <ReportCard
        report={report}
        variant="detail"
        onClose={onClose}
        headerIcon={NodeIcon}
        pathRoot={null}
        documentContent={(
          <div className={styles.documentLayout}>
            <div className={styles.documentScroll}>
              {summary
                ? <SummaryDocument summary={summary} />
                : <SummaryState node={node} error={error} isLoading={isLoading} />}
            </div>
            <div className={styles.composerDock}>
              <PromptComposer
                isGenerating={false}
                onSend={onBranchPromptSend}
                clarification={null}
                isSubmittingClarification={false}
                clarificationError={null}
                onClarificationSend={async () => undefined}
              />
            </div>
          </div>
        )}
        className={styles.summaryCard}
      />
    </aside>
  );
}
