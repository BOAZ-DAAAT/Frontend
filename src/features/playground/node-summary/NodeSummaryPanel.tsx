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
import { useEffect, useState, type ReactNode } from 'react';

import { getAgentRunArtifactContent } from './api';
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
  runId: string | null;
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
  mart_preview: '최종 데이터마트',
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

function CodeChip({ children }: { children: string }) {
  return <code className={styles.codeChip}>{children}</code>;
}

function CodeChipList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className={styles.chipList}>
      {items.map((item) => <CodeChip key={item}>{item}</CodeChip>)}
    </div>
  );
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function getFindingArray(value: unknown): NodeSummaryFinding[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isFinding);
}

function getRecordRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。]|습니다\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectCodeTerms(value: unknown, terms = new Set<string>()): string[] {
  if (typeof value === 'string') {
    const matches = value.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) ?? [];
    matches.forEach((term) => terms.add(term));
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectCodeTerms(item, terms));
  } else if (isRecord(value)) {
    Object.values(value).forEach((item) => collectCodeTerms(item, terms));
  }
  return [...terms];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isTokenBoundary(value: string | undefined) {
  return !value || !/[A-Za-z0-9_]/.test(value);
}

function renderCodeTerms(text: string, codeTerms: string[], keyPrefix: string): ReactNode[] {
  if (!text || !codeTerms.length) return [text];
  const terms = [...new Set(codeTerms.filter(Boolean))].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(terms.map(escapeRegExp).join('|'), 'g');
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const term = match[0];
    const start = match.index;
    const end = start + term.length;
    if (!isTokenBoundary(text[start - 1]) || !isTokenBoundary(text[end])) continue;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
    nodes.push(<CodeChip key={`${keyPrefix}-code-${start}-${term}`}>{term}</CodeChip>);
    lastIndex = end;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : [text];
}

function RichText({ text, codeTerms }: { text: string; codeTerms: string[] }) {
  const nodes: ReactNode[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(...renderCodeTerms(text.slice(lastIndex, match.index), codeTerms, `plain-${match.index}`));
    }
    nodes.push(
      <strong key={`bold-${match.index}`}>
        {renderCodeTerms(match[1], codeTerms, `bold-${match.index}`)}
      </strong>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(...renderCodeTerms(text.slice(lastIndex), codeTerms, `plain-${lastIndex}`));
  }
  return <>{nodes}</>;
}

const SQL_TOKEN_PATTERN = /(--.*?$|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:[^"]|"")*"|\b(?:ADD|ALTER|AND|AS|ASC|AVG|BY|CASE|CAST|COUNT|CREATE|DATE_FORMAT|DAY|DELETE|DESC|DISTINCT|ELSE|END|FROM|GROUP|HAVING|IN|INNER|INSERT|INTO|IS|JOIN|LEFT|LIMIT|MAX|MIN|NOT|NULL|ON|OR|ORDER|OUTER|OVER|PARTITION|RIGHT|ROW_NUMBER|SELECT|SET|SUM|TABLE|THEN|TIMESTAMPDIFF|UPDATE|WHEN|WHERE|WITH)\b|\b\d+(?:\.\d+)?\b)/gim;

function sqlTokenClassName(token: string) {
  if (token.startsWith('--') || token.startsWith('/*')) return styles.sqlComment;
  if (token.startsWith("'") || token.startsWith('"')) return styles.sqlString;
  if (/^\d/.test(token)) return styles.sqlNumber;
  return styles.sqlKeyword;
}

function SqlCodeBlock({ code }: { code: string }) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  SQL_TOKEN_PATTERN.lastIndex = 0;
  while ((match = SQL_TOKEN_PATTERN.exec(code)) !== null) {
    if (match.index > lastIndex) nodes.push(code.slice(lastIndex, match.index));
    nodes.push(
      <span key={`${match.index}-${match[0]}`} className={sqlTokenClassName(match[0])}>
        {match[0]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) nodes.push(code.slice(lastIndex));
  return (
    <pre className={styles.sqlCodeBlock}>
      <code>{nodes}</code>
    </pre>
  );
}

function SqlPreviewTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return (
    <div className={`${styles.tableWrap} ${styles.sqlPreviewTable}`}>
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}><CodeChip>{column}</CodeChip></th>)}</tr>
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

function ChartImage({ runId, artifactId }: { runId: string | null; artifactId: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setImageUrl(null);
    setHasError(false);
    if (!runId) {
      setHasError(true);
      return () => undefined;
    }

    void getAgentRunArtifactContent(runId, artifactId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [artifactId, runId]);

  if (hasError) {
    return <div className={styles.chartFallback}>차트 artifact를 불러오지 못했습니다. ({artifactId})</div>;
  }
  if (!imageUrl) {
    return <div className={styles.chartFallback}>차트를 불러오는 중입니다.</div>;
  }
  return <img className={styles.chartImage} src={imageUrl} alt="EDA chart artifact" />;
}

function FindingCharts({ runId, chartArtifactIds }: { runId: string | null; chartArtifactIds?: string[] }) {
  if (!chartArtifactIds?.length) return null;
  return (
    <div className={styles.chartGrid}>
      {chartArtifactIds.map((artifactId) => (
        <ChartImage key={artifactId} runId={runId} artifactId={artifactId} />
      ))}
    </div>
  );
}

function SummaryValue({ value, codeTerms = [] }: { value: unknown; codeTerms?: string[] }) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number') {
    return <p><RichText text={String(value)} codeTerms={codeTerms} /></p>;
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
                <p><RichText text={item.body} codeTerms={codeTerms} /></p>
              </div>
            ) : isRecord(item) ? <SummaryObject value={item} codeTerms={codeTerms} /> : <RichText text={String(item)} codeTerms={codeTerms} />}
          </li>
        ))}
      </ul>
    );
  }
  if (isRecord(value)) return <SummaryObject value={value} codeTerms={codeTerms} />;
  return null;
}

function SummaryObject({ value, codeTerms = [] }: { value: Record<string, unknown>; codeTerms?: string[] }) {
  return (
    <dl className={styles.objectList}>
      {Object.entries(value).map(([key, item]) => {
        if (item === null || item === '' || (Array.isArray(item) && item.length === 0)) return null;
        return (
          <div key={key}>
            <dt>{DETAIL_LABELS[key] ?? key.replace(/_/g, ' ')}</dt>
            <dd><SummaryValue value={item} codeTerms={codeTerms} /></dd>
          </div>
        );
      })}
    </dl>
  );
}

function SqlSummaryDocument({ summary }: { summary: NodeSummary }) {
  const detail = summary.detail;
  const integrityChecks = getStringArray(detail.integrity_checks);
  const sourceTables = getStringArray(detail.source_tables);
  const martColumns = getStringArray(detail.mart_columns);
  const martPreview = getRecordRows(detail.mart_preview);
  const derivedColumns = getFindingArray(detail.derived_columns);
  const designRationale = getString(detail.design_rationale);
  const interpretationScope = getStringArray(detail.interpretation_scope);
  const codeTerms = [...sourceTables, ...martColumns, ...derivedColumns.map((item) => item.heading)];

  return (
    <div className={`${styles.document} ${styles.sqlDocument}`}>
      <header className={styles.documentHeader}>
        <span className={styles.kind}>{summary.detail.kind.toUpperCase()}</span>
        <h2>{summary.title}</h2>
        <p className={styles.subtitle}>{summary.subtitle}</p>
      </header>

      <section className={styles.sqlSection}>
        <h3>분석 배경</h3>
        <div className={styles.sectionBody}>
          <p><RichText text={summary.background} codeTerms={codeTerms} /></p>
        </div>
      </section>

      {integrityChecks.length ? (
        <section className={styles.sqlSection}>
          <h3>정합성 확인</h3>
          <ul className={`${styles.compactList} ${styles.sectionBody}`}>
            {integrityChecks.map((item, index) => (
              <li key={index}><RichText text={item} codeTerms={codeTerms} /></li>
            ))}
          </ul>
        </section>
      ) : null}

      {designRationale ? (
        <section className={styles.sqlSection}>
          <h3>SQL 수행과정</h3>
          <div className={styles.sectionBody}>
            <p><RichText text={designRationale} codeTerms={codeTerms} /></p>
          </div>
        </section>
      ) : null}

      <section className={styles.sqlSection}>
        <h3>최종 데이터마트</h3>
        {martPreview.length ? <SqlPreviewTable rows={martPreview} /> : null}
        {sourceTables.length ? (
          <details className={styles.sqlMetaDetails}>
            <summary>원본 테이블</summary>
            <CodeChipList items={sourceTables} />
          </details>
        ) : null}
        {martColumns.length ? (
          <details className={styles.sqlMetaDetails}>
            <summary>구성 컬럼</summary>
            <CodeChipList items={martColumns} />
          </details>
        ) : null}
      </section>

      {derivedColumns.length ? (
        <section className={styles.sqlSection}>
          <h3>파생 컬럼</h3>
          <div className={styles.derivedList}>
            {derivedColumns.map((item) => (
              <article key={item.heading} className={styles.derivedItem}>
                <h4>{item.heading}</h4>
                <p><RichText text={item.body} codeTerms={codeTerms} /></p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`${styles.sqlSection} ${styles.conclusion}`}>
        <h3>결론</h3>
        <div className={styles.sectionBody}>
          <p><RichText text={summary.conclusion} codeTerms={codeTerms} /></p>
        </div>
      </section>

      {interpretationScope.length ? (
        <section className={`${styles.sqlSection} ${styles.cautionSection}`}>
          <h3>주의사항</h3>
          <ul className={`${styles.compactList} ${styles.sectionBody}`}>
            {interpretationScope.map((item, index) => (
              <li key={index}><RichText text={item} codeTerms={codeTerms} /></li>
            ))}
          </ul>
        </section>
      ) : null}

      {summary.code_used ? (
        <section className={`${styles.sqlSection} ${styles.finalQuerySection}`}>
          <h3>최종 쿼리</h3>
          <SqlCodeBlock code={summary.code_used} />
        </section>
      ) : null}
    </div>
  );
}

function EdaSummaryDocument({ summary, runId }: { summary: NodeSummary; runId: string | null }) {
  const detail = summary.detail;
  const dataProfile = getString(detail.data_profile);
  const qualityIssues = getStringArray(detail.quality_issues);
  const statisticalFindings = getFindingArray(detail.statistical_findings);
  const hypotheses = getStringArray(detail.hypotheses);
  const interpretationScope = getStringArray(detail.interpretation_scope);
  const codeTerms = collectCodeTerms(summary);

  return (
    <div className={`${styles.document} ${styles.sqlDocument}`}>
      <header className={styles.documentHeader}>
        <span className={styles.kind}>{summary.detail.kind.toUpperCase()}</span>
        <h2>{summary.title}</h2>
        <p className={styles.subtitle}>{summary.subtitle}</p>
      </header>

      <section className={styles.sqlSection}>
        <h3>분석 배경</h3>
        <div className={styles.sectionBody}>
          <p><RichText text={summary.background} codeTerms={codeTerms} /></p>
        </div>
      </section>

      {dataProfile ? (
        <section className={styles.sqlSection}>
          <h3>데이터마트 프로파일</h3>
          <ul className={`${styles.profileList} ${styles.sectionBody}`}>
            {splitSentences(dataProfile).map((item, index) => (
              <li key={index}><RichText text={item} codeTerms={codeTerms} /></li>
            ))}
          </ul>
        </section>
      ) : null}

      {qualityIssues.length ? (
        <section className={styles.sqlSection}>
          <h3>데이터 품질</h3>
          <ul className={`${styles.compactList} ${styles.sectionBody}`}>
            {qualityIssues.map((item, index) => (
              <li key={index}><RichText text={item} codeTerms={codeTerms} /></li>
            ))}
          </ul>
        </section>
      ) : null}

      {statisticalFindings.length ? (
        <section className={styles.sqlSection}>
          <h3>통계적 발견</h3>
          <div className={styles.findingStack}>
            {statisticalFindings.map((item, index) => (
              <article key={`${item.heading}-${index}`} className={styles.edaFinding}>
                <h4>{index + 1}. {item.heading}</h4>
                <FindingCharts runId={runId} chartArtifactIds={item.chart_artifact_ids} />
                {item.rationale ? (
                  <p className={styles.findingRationale}>
                    <RichText text={item.rationale} codeTerms={codeTerms} />
                  </p>
                ) : null}
                <p><RichText text={item.body} codeTerms={codeTerms} /></p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {hypotheses.length ? (
        <section className={styles.sqlSection}>
          <h3>제안 가설</h3>
          <div className={styles.hypothesisList}>
            {hypotheses.map((item, index) => (
              <article key={`${item}-${index}`} className={styles.hypothesisItem}>
                <h4>{index + 1}. <RichText text={item} codeTerms={codeTerms} /></h4>
                <p>
                  근거: 위 통계적 발견 {Math.min(index + 1, statisticalFindings.length || 1)}번에서 관찰된 패턴을 후속 분석에서 검증할 후보로 정리했습니다.
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`${styles.sqlSection} ${styles.conclusion}`}>
        <h3>결론</h3>
        <div className={styles.sectionBody}>
          <p><RichText text={summary.conclusion} codeTerms={codeTerms} /></p>
        </div>
      </section>

      {interpretationScope.length ? (
        <section className={`${styles.sqlSection} ${styles.cautionSection}`}>
          <h3>주의사항</h3>
          <ul className={`${styles.compactList} ${styles.sectionBody}`}>
            {interpretationScope.map((item, index) => (
              <li key={index}><RichText text={item} codeTerms={codeTerms} /></li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SummaryDocument({ summary, runId }: { summary: NodeSummary; runId: string | null }) {
  if (summary.detail.kind === 'sql') {
    return <SqlSummaryDocument summary={summary} />;
  }
  if (summary.detail.kind === 'eda') {
    return <EdaSummaryDocument summary={summary} runId={runId} />;
  }
  const codeTerms = collectCodeTerms(summary);
  const hiddenKeys = new Set<string>(['handoff']);
  const detailEntries = Object.entries(summary.detail).filter(([key]) => (
    key !== 'kind' && !hiddenKeys.has(key)
  ));
  return (
    <div className={styles.document}>
      <header className={styles.documentHeader}>
        <span className={styles.kind}>{summary.detail.kind.toUpperCase()}</span>
        <h2>{summary.title}</h2>
        <p className={styles.subtitle}>{summary.subtitle}</p>
      </header>

      <section>
        <h3>분석 배경</h3>
        <p><RichText text={summary.background} codeTerms={codeTerms} /></p>
      </section>

      {detailEntries.map(([key, value]) => (
        <section key={key}>
          <h3>{DETAIL_LABELS[key] ?? key.replace(/_/g, ' ')}</h3>
          <SummaryValue value={value} codeTerms={codeTerms} />
        </section>
      ))}

      {summary.code_used ? (
        <details className={styles.codeDetails}>
          <summary>사용한 코드</summary>
          <pre><code>{summary.code_used}</code></pre>
        </details>
      ) : null}

      <section className={styles.conclusion}>
        <h3>결론</h3>
        <p><RichText text={summary.conclusion} codeTerms={codeTerms} /></p>
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
  runId,
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
                ? <SummaryDocument summary={summary} runId={runId} />
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
                approval={null}
                isSubmittingApproval={false}
                approvalError={null}
                onApprovalDecision={async () => undefined}
              />
            </div>
          </div>
        )}
        className={styles.summaryCard}
      />
    </aside>
  );
}
