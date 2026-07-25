import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

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
import type {
  PlaygroundNodeKind,
  PlaygroundNodeStatus,
} from '@/features/playground/types';

import { getAgentRunArtifactContent } from './api';
import type { NodeSummary, NodeSummaryAnalysisItem, NodeSummaryFinding } from './types';
import styles from './NodeSummaryPanel.module.css';

type NodeSummaryPanelProps = {
  node: {
    id: string;
    label: string;
    kind: PlaygroundNodeKind;
    status: PlaygroundNodeStatus;
  };
  summary: NodeSummary | null;
  runId: string | null;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onBranchPromptSend: (prompt: string) => Promise<void>;
  artifactUrls?: Record<string, string>;
};

const NODE_ICONS: Record<PlaygroundNodeKind, LucideIcon> = {
  supervisor: ScanSearch,
  datasource: Database,
  'sql-agent': SquareTerminal,
  'EDA-agent': ChartNoAxesCombined,
  'analysis-agent': ScanSearch,
  'insight-agent': Lightbulb,
};

const MIN_PANEL_WIDTH = 640;
const SIDEBAR_CLEARANCE = 280;
const PANEL_RIGHT_GUTTER = 24;

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

function isAnalysisItem(value: unknown): value is NodeSummaryAnalysisItem {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<NodeSummaryAnalysisItem>;
  return typeof candidate.title === 'string' && candidate.title.trim().length > 0;
}

function getAnalysisItems(value: unknown): NodeSummaryAnalysisItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isAnalysisItem);
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

function ChartImage({
  runId,
  artifactId,
  artifactUrl,
}: {
  runId: string | null;
  artifactId: string;
  artifactUrl?: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setImageUrl(null);
    setHasError(false);
    if (artifactUrl) {
      setImageUrl(artifactUrl);
      return () => undefined;
    }
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
  }, [artifactId, artifactUrl, runId]);

  if (hasError) {
    return <div className={styles.chartFallback}>차트 artifact를 불러오지 못했습니다. ({artifactId})</div>;
  }
  if (!imageUrl) {
    return <div className={styles.chartFallback}>차트를 불러오는 중입니다.</div>;
  }
  return <img className={styles.chartImage} src={imageUrl} alt="EDA chart artifact" />;
}

function FindingCharts({
  runId,
  chartArtifactIds,
  artifactUrls,
}: {
  runId: string | null;
  chartArtifactIds?: string[];
  artifactUrls?: Record<string, string>;
}) {
  if (!chartArtifactIds?.length) return null;
  return (
    <div className={styles.chartGrid}>
      {chartArtifactIds.map((artifactId) => (
        <ChartImage
          key={artifactId}
          runId={runId}
          artifactId={artifactId}
          artifactUrl={artifactUrls?.[artifactId]}
        />
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

function stringifySummaryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join(', ');
  }
  return String(value ?? '').trim();
}

function toReportTone(text: string): string {
  return text
    .replace(/직접적이다\./g, '직접적입니다.')
    .replace(/적절하다\./g, '적절합니다.')
    .replace(/필요하다\./g, '필요합니다.')
    .replace(/보여준다\./g, '보여줍니다.')
    .replace(/나타난다\./g, '나타납니다.')
    .replace(/보인다\./g, '보입니다.')
    .replace(/시사한다\./g, '시사합니다.')
    .replace(/지지한다\./g, '지지합니다.')
    .replace(/맞다\./g, '맞습니다.')
    .replace(/사용했다\./g, '사용했습니다.')
    .replace(/고려했다\./g, '고려했습니다.')
    .replace(/확인했다\./g, '확인했습니다.')
    .replace(/만들었다\./g, '만들었습니다.')
    .replace(/했다\./g, '했습니다.')
    .replace(/않는다\./g, '않습니다.')
    .replace(/없다\./g, '없습니다.')
    .replace(/있다\./g, '있습니다.')
    .replace(/한다\./g, '합니다.')
    .replace(/이다\./g, '입니다.');
}

function ensureReportSentence(text: string): string {
  const value = toReportTone(text).trim();
  if (!value) return '';
  if (/(습니다|됩니다|하였습니다|입니다|였습니다|입니다)\.$/.test(value)) return value;
  if (value.endsWith('됨')) return `${value.slice(0, -1)}됩니다.`;
  if (/[.!?]$/.test(value)) return value;
  return `${value}입니다.`;
}

function normalizeMethodItem(label: string, text: string): string {
  const value = String(text).trim();
  if (!value) return '';
  if (label === 'fallbacks considered') {
    const base = value.replace(/[.!?]$/, '').replace(/입니다$/, '');
    return `대안으로 ${base}을 검토할 수 있습니다.`;
  }
  return ensureReportSentence(value);
}

function analysisPurposeText(item: NodeSummaryAnalysisItem): string {
  if (item.purpose?.trim()) return item.purpose.trim();
  if (item.method?.trim()) {
    return `이 항목은 ${item.title} 항목의 판단 근거를 ${item.method.trim()} 방법으로 확인했습니다.`;
  }
  return `이 항목은 ${item.title} 항목의 판단 근거를 확인하기 위해 분석했습니다.`;
}

function analysisTitle(title: string): string {
  const value = title.trim();
  if (!value || value.includes('분석')) return value;
  return `${value} 분석`;
}

function MethodStep({
  index,
  label,
  lead,
  value,
  codeTerms,
}: {
  index: number;
  label: string;
  lead: string;
  value: unknown;
  codeTerms: string[];
}) {
  const items = Array.isArray(value)
    ? value.map((item) => normalizeMethodItem(label, String(item))).filter(Boolean)
    : [];
  const body = normalizeMethodItem(label, stringifySummaryValue(value));
  if (!body && !items.length) return null;
  const ListTag = label === 'assumptions checked' ? 'ol' : 'ul';
  return (
    <article className={styles.analysisMethodStep}>
      <h4>{index}. {label}</h4>
      <p><strong>{lead}</strong></p>
      {items.length ? (
        <ListTag className={styles.analysisMethodBullets}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}><RichText text={item} codeTerms={codeTerms} /></li>
          ))}
        </ListTag>
      ) : (
        <p><RichText text={body} codeTerms={codeTerms} /></p>
      )}
    </article>
  );
}

function extractQuoted(text: string, label: string): string {
  const match = text.match(new RegExp(`${label}은 '([^']+)'`));
  return match?.[1]?.trim() ?? '';
}

function extractBetween(text: string, start: string, end: string): string {
  const startIndex = text.indexOf(start);
  if (startIndex === -1) return '';
  const bodyStart = startIndex + start.length;
  const endIndex = text.indexOf(end, bodyStart);
  return text.slice(bodyStart, endIndex === -1 ? undefined : endIndex).trim();
}

function parseAnalysisEvidenceBody(body: string) {
  const nullHypothesis = extractQuoted(body, '귀무가설');
  const alternativeHypothesis = extractQuoted(body, '대립가설');
  const decision = extractQuoted(body, '원본 판정');
  const evidence = extractBetween(body, '근거는 ', '입니다.');
  const caution = extractBetween(body, '주의사항은 ', '입니다.');
  return {
    nullHypothesis,
    alternativeHypothesis,
    decision,
    evidence,
    caution: caution.replace(/^'|'$/g, ''),
  };
}

function AnalysisEvidenceCard({
  item,
  index,
  codeTerms,
}: {
  item: NodeSummaryFinding;
  index: number;
  codeTerms: string[];
}) {
  const parsed = parseAnalysisEvidenceBody(item.body);
  const hasStructuredBody = Boolean(
    parsed.nullHypothesis || parsed.alternativeHypothesis || parsed.decision || parsed.evidence || parsed.caution,
  );

  return (
    <article className={styles.analysisHypothesisCard}>
      <h4>{index + 1}. <RichText text={item.heading} codeTerms={codeTerms} /></h4>
      {item.rationale ? (
        <p className={styles.hypothesisReason}>
          분석 이유: <RichText text={ensureReportSentence(item.rationale)} codeTerms={codeTerms} />
        </p>
      ) : null}
      {hasStructuredBody ? (
        <dl className={styles.analysisEvidenceList}>
          {parsed.decision ? (
            <div>
              <dt>판단</dt>
              <dd><RichText text={parsed.decision} codeTerms={codeTerms} /></dd>
            </div>
          ) : null}
          {parsed.evidence ? (
            <div>
              <dt>수치 근거</dt>
              <dd><RichText text={parsed.evidence} codeTerms={codeTerms} /></dd>
            </div>
          ) : null}
          {parsed.nullHypothesis || parsed.alternativeHypothesis ? (
            <div>
              <dt>비교 기준</dt>
              <dd>
                {parsed.nullHypothesis ? (
                  <p>귀무가설: <RichText text={parsed.nullHypothesis} codeTerms={codeTerms} /></p>
                ) : null}
                {parsed.alternativeHypothesis ? (
                  <p>대립가설: <RichText text={parsed.alternativeHypothesis} codeTerms={codeTerms} /></p>
                ) : null}
              </dd>
            </div>
          ) : null}
          {parsed.caution ? (
            <div>
              <dt>해석 경계</dt>
              <dd><RichText text={ensureReportSentence(parsed.caution)} codeTerms={codeTerms} /></dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p><RichText text={ensureReportSentence(item.body)} codeTerms={codeTerms} /></p>
      )}
    </article>
  );
}

function AnalysisItemCard({
  item,
  index,
  codeTerms,
}: {
  item: NodeSummaryAnalysisItem;
  index: number;
  codeTerms: string[];
}) {
  const keyNumbers = Array.isArray(item.key_numbers) ? item.key_numbers.filter(Boolean) : [];
  const purpose = analysisPurposeText(item);
  return (
    <article className={styles.analysisHypothesisCard}>
      <h4>{index + 1}. <RichText text={item.title} codeTerms={codeTerms} /></h4>
      {purpose ? (
        <p className={styles.hypothesisReason}>
          분석 목적: <RichText text={ensureReportSentence(purpose)} codeTerms={codeTerms} />
        </p>
      ) : null}
      {keyNumbers.length ? (
        <div className={styles.analysisNumberChips}>
          {keyNumbers.map((number) => <span key={number}>{number}</span>)}
        </div>
      ) : null}
      <dl className={styles.analysisEvidenceList}>
        {item.method ? (
          <div>
            <dt>방법</dt>
            <dd><RichText text={ensureReportSentence(item.method)} codeTerms={codeTerms} /></dd>
          </div>
        ) : null}
        {item.result || item.decision ? (
          <div>
            <dt>판정</dt>
            <dd><RichText text={ensureReportSentence(item.result || item.decision || '')} codeTerms={codeTerms} /></dd>
          </div>
        ) : null}
        {item.interpretation ? (
          <div>
            <dt>해석</dt>
            <dd><RichText text={ensureReportSentence(item.interpretation)} codeTerms={codeTerms} /></dd>
          </div>
        ) : null}
        {item.caution ? (
          <div>
            <dt>주의</dt>
            <dd><RichText text={ensureReportSentence(item.caution)} codeTerms={codeTerms} /></dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function getEvidenceTables(value: unknown): { title: string; rows: Record<string, unknown>[] }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((table, index) => ({
      title: getString(table['title']) || `근거 표 ${index + 1}`,
      rows: getRecordRows(table['rows']),
    }))
    .filter((table) => table.rows.length);
}

function AnalysisSummaryDocument({ summary }: { summary: NodeSummary }) {
  const detail = summary.detail;
  const methodDecision = isRecord(detail.method_decision) ? detail.method_decision : {};
  const analysisItems = getAnalysisItems(detail.analysis_items);
  const hypothesisTests = getFindingArray(detail.hypothesis_tests);
  const keyStatistics = getFindingArray(detail.key_statistics);
  const evidenceTables = getEvidenceTables(detail.evidence_tables);
  const limitations = getStringArray(detail.limitations).slice(0, 3);
  const interpretation = getString(detail.interpretation);
  const limitationTerms = ['집계 수준', '인과', '소표본', '계절성', '통제'];
  const interpretationSentences = splitSentences(interpretation);
  const interpretationItems = interpretationSentences
    .filter((item) => !limitationTerms.some((term) => item.includes(term)))
    .slice(0, 3);
  const cautionItems = [
    ...new Set([
      ...splitSentences(interpretation).filter((item) => limitationTerms.some((term) => item.includes(term))),
      ...limitations,
    ].map((item) => ensureReportSentence(item))),
  ].slice(0, 2);
  const conclusionItems = splitSentences(summary.conclusion)
    .filter((item) => !limitationTerms.some((term) => item.includes(term)))
    .slice(0, 1);
  const codeTerms = collectCodeTerms(summary);

  return (
    <div className={`${styles.document} ${styles.analysisDocument}`}>
      <header className={styles.documentHeader}>
        <span className={styles.kind}>{summary.detail.kind.toUpperCase()}</span>
        <h2>{analysisTitle(summary.title)}</h2>
        <p className={styles.subtitle}>{summary.subtitle}</p>
      </header>

      <section className={styles.sqlSection}>
        <h3>분석 배경</h3>
        <div className={styles.sectionBody}>
          <p><RichText text={summary.background} codeTerms={codeTerms} /></p>
        </div>
      </section>

      {Object.keys(methodDecision).length ? (
        <section className={styles.sqlSection}>
          <h3>분석 방법</h3>
          <div className={styles.analysisMethodList}>
            <MethodStep
              index={1}
              label="selected method"
              lead="선택한 분석 방법은 다음과 같습니다."
              value={methodDecision['selected_method']}
              codeTerms={codeTerms}
            />
            <MethodStep
              index={2}
              label="rationale"
              lead="이 방법을 선택한 이유는 다음과 같습니다."
              value={methodDecision['rationale']}
              codeTerms={codeTerms}
            />
            <MethodStep
              index={3}
              label="assumptions checked"
              lead="이를 위해 확인한 분석 전제는 다음과 같습니다."
              value={methodDecision['assumptions_checked']}
              codeTerms={codeTerms}
            />
            <MethodStep
              index={4}
              label="fallbacks considered"
              lead="또한 대안적으로 검토한 방법은 다음과 같습니다."
              value={methodDecision['fallbacks_considered']}
              codeTerms={codeTerms}
            />
          </div>
        </section>
      ) : null}

      {analysisItems.length || hypothesisTests.length ? (
        <section className={styles.sqlSection}>
          <h3>본 분석</h3>
          <div className={styles.analysisHypothesisList}>
            {analysisItems.length
              ? analysisItems.map((item, index) => (
                <AnalysisItemCard
                  key={`${item.title}-${index}`}
                  item={item}
                  index={index}
                  codeTerms={codeTerms}
                />
              ))
              : hypothesisTests.map((item, index) => (
                <AnalysisEvidenceCard
                  key={`${item.heading}-${index}`}
                  item={item}
                  index={index}
                  codeTerms={codeTerms}
                />
              ))}
          </div>
        </section>
      ) : null}

      {keyStatistics.length ? (
        <section className={styles.sqlSection}>
          <h3>핵심 통계</h3>
          <div className={styles.analysisStatList}>
            {keyStatistics.map((item, index) => (
              <article key={`${item.heading}-${index}`} className={styles.analysisStatItem}>
                <h4>{item.heading}</h4>
                <p><RichText text={toReportTone(item.body)} codeTerms={codeTerms} /></p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {evidenceTables.length ? (
        <details className={styles.analysisEvidenceDetails}>
          <summary>evidence tables</summary>
          <p className={styles.sectionNote}>
            검정 결과를 뒷받침하기 위해 분석 단계가 함께 저장한 근거 표입니다.
          </p>
          <div className={styles.analysisEvidenceStack}>
            {evidenceTables.map((table, index) => (
              <article key={`${table.title}-${index}`} className={styles.analysisEvidenceTable}>
                <h4>{table.title}</h4>
                <PreviewTable rows={table.rows} />
              </article>
            ))}
          </div>
        </details>
      ) : null}

      {interpretationSentences.length ? (
        <section className={styles.sqlSection}>
          <h3>분석 결과</h3>
          <div className={styles.analysisResultList}>
            {(interpretationItems.length ? interpretationItems : interpretationSentences.slice(0, 2)).map((item, index) => (
              <article key={`${item}-${index}`} className={styles.analysisResultItem}>
                <span>{index + 1}</span>
                <p><RichText text={toReportTone(item)} codeTerms={codeTerms} /></p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {cautionItems.length ? (
        <section className={`${styles.sqlSection} ${styles.cautionSection}`}>
          <h3>주의사항</h3>
          <ul className={`${styles.compactList} ${styles.sectionBody}`}>
            {cautionItems.map((item, index) => (
              <li key={index}><RichText text={item} codeTerms={codeTerms} /></li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={`${styles.sqlSection} ${styles.conclusion}`}>
        <h3>결론</h3>
        <div className={styles.sectionBody}>
          {(conclusionItems.length ? conclusionItems : [summary.conclusion]).map((item, index) => (
            <p key={index}><RichText text={toReportTone(item)} codeTerms={codeTerms} /></p>
          ))}
        </div>
      </section>

    </div>
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

function EdaSummaryDocument({
  summary,
  runId,
  artifactUrls,
}: {
  summary: NodeSummary;
  runId: string | null;
  artifactUrls?: Record<string, string>;
}) {
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
                <FindingCharts
                  runId={runId}
                  chartArtifactIds={item.chart_artifact_ids}
                  artifactUrls={artifactUrls}
                />
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

function firstSentences(text: string, count: number): string {
  return splitSentences(text).slice(0, count).join(' ');
}

function InsightStageCard({
  title,
  description,
  body,
  codeTerms,
  children,
}: {
  title: string;
  description: string;
  body: string;
  codeTerms: string[];
  children?: ReactNode;
}) {
  return (
    <section className={styles.insightStageCard}>
      <div className={styles.insightStageHeader}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {body ? (
        <p className={styles.insightStageBody}>
          <RichText text={ensureReportSentence(body)} codeTerms={codeTerms} />
        </p>
      ) : null}
      {children}
    </section>
  );
}

function InsightSummaryDocument({
  summary,
  runId,
  artifactUrls,
}: {
  summary: NodeSummary;
  runId: string | null;
  artifactUrls?: Record<string, string>;
}) {
  const detail = summary.detail;
  const codeTerms = collectCodeTerms(summary);
  const answer = getString(detail.answer) || summary.key_finding || summary.conclusion;
  const asIs = firstSentences(getString(detail.as_is) || getString(detail.evidence_synthesis) || answer, 2);
  const toBe = getString(detail.to_be) || '확인된 관계를 운영 관리 기준으로 삼아 우선 점검 대상과 추적 지표를 정리해야 합니다.';
  const toBeItems = splitSentences(toBe);
  const actionPlan = getStringArray(detail.action_plan).slice(0, 3);
  const actionItems = actionPlan.length ? actionPlan : ['근거 기반 실행 제안은 추가 검증 후 확정해야 합니다.'];
  const limitations = getStringArray(detail.limitations).slice(0, 2);
  const supportingCharts = getFindingArray(detail.supporting_charts).slice(0, 1);

  return (
    <div className={`${styles.document} ${styles.insightDocument}`}>
      <header className={styles.documentHeader}>
        <span className={styles.kind}>{summary.detail.kind.toUpperCase()}</span>
        <h2>{summary.title}</h2>
        <p className={styles.subtitle}>{ensureReportSentence(summary.subtitle)}</p>
      </header>

      <InsightStageCard
        title="AS-IS"
        description="분석으로 확인한 현재 상태입니다."
        body={asIs}
        codeTerms={codeTerms}
      >
        {supportingCharts.map((item, index) => (
          <article key={`${item.heading}-${index}`} className={styles.insightChartCard}>
            <h4>{item.heading}</h4>
            <FindingCharts
              runId={runId}
              chartArtifactIds={item.chart_artifact_ids}
              artifactUrls={artifactUrls}
            />
          </article>
        ))}
      </InsightStageCard>

      <InsightStageCard
        title="TO-BE"
        description="이 결과가 가리키는 지향 방향입니다."
        body=""
        codeTerms={codeTerms}
      >
        <ol className={styles.insightActionList}>
          {(toBeItems.length ? toBeItems : [toBe]).map((item, index) => (
            <li key={index}>
              <span>{index + 1}</span>
              <p><RichText text={ensureReportSentence(item)} codeTerms={codeTerms} /></p>
            </li>
          ))}
        </ol>
      </InsightStageCard>

      <InsightStageCard
        title="ACTION"
        description="목표 상태로 가기 위한 실행 제안입니다."
        body=""
        codeTerms={codeTerms}
      >
        <ol className={styles.insightActionList}>
          {actionItems.map((item, index) => (
            <li key={index}>
              <span>{index + 1}</span>
              <p><RichText text={ensureReportSentence(item)} codeTerms={codeTerms} /></p>
            </li>
          ))}
        </ol>
      </InsightStageCard>

      {limitations.length ? (
        <section className={`${styles.sqlSection} ${styles.cautionSection}`}>
          <h3>주의사항</h3>
          <ul className={`${styles.compactList} ${styles.sectionBody}`}>
            {limitations.map((item, index) => (
              <li key={index}><RichText text={ensureReportSentence(item)} codeTerms={codeTerms} /></li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SummaryDocument({
  summary,
  runId,
  artifactUrls,
}: {
  summary: NodeSummary;
  runId: string | null;
  artifactUrls?: Record<string, string>;
}) {
  if (summary.detail.kind === 'sql') {
    return <SqlSummaryDocument summary={summary} />;
  }
  if (summary.detail.kind === 'eda') {
    return <EdaSummaryDocument summary={summary} runId={runId} artifactUrls={artifactUrls} />;
  }
  if (summary.detail.kind === 'analysis') {
    return <AnalysisSummaryDocument summary={summary} />;
  }
  if (summary.detail.kind === 'insight') {
    return <InsightSummaryDocument summary={summary} runId={runId} artifactUrls={artifactUrls} />;
  }
  const codeTerms = collectCodeTerms(summary);
  const hiddenKeys = new Set<string>(['handoff']);
  const detailEntries = Object.entries(summary.detail).filter(([key]) => (
    key !== 'kind' && !hiddenKeys.has(key)
  ));
  const detailKind = String((summary.detail as Record<string, unknown>).kind ?? 'summary');
  return (
    <div className={styles.document}>
      <header className={styles.documentHeader}>
        <span className={styles.kind}>{detailKind.toUpperCase()}</span>
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
    : node.status === 'cancelled'
      ? '사용자가 중단한 노드에는 완료 서머리가 없습니다.'
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
  artifactUrls,
}: NodeSummaryPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const resizeStartRef = useRef<{ clientX: number; width: number } | null>(null);
  const [panelWidth, setPanelWidth] = useState(MIN_PANEL_WIDTH);
  const NodeIcon = NODE_ICONS[node.kind];
  const report: Report = {
    id: `node-summary-${node.id}`,
    title: summary?.title ?? node.label,
    author: '',
    date: '',
    markdown: '',
  };

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const resizeStart = resizeStartRef.current;
      if (!resizeStart) return;

      const maxWidth = Math.max(
        MIN_PANEL_WIDTH,
        window.innerWidth - SIDEBAR_CLEARANCE - PANEL_RIGHT_GUTTER,
      );
      const nextWidth = resizeStart.width + resizeStart.clientX - event.clientX;
      setPanelWidth(Math.min(Math.max(nextWidth, MIN_PANEL_WIDTH), maxWidth));
    };

    const handlePointerUp = () => {
      resizeStartRef.current = null;
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const handleResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;

    resizeStartRef.current = {
      clientX: event.clientX,
      width: panel.getBoundingClientRect().width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = 'col-resize';
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? 1 : -1;
    const maxWidth = Math.max(
      MIN_PANEL_WIDTH,
      window.innerWidth - SIDEBAR_CLEARANCE - PANEL_RIGHT_GUTTER,
    );
    setPanelWidth((currentWidth) => Math.min(
      Math.max(currentWidth + direction * 32, MIN_PANEL_WIDTH),
      maxWidth,
    ));
  };

  const panelStyle = {
    '--summary-width': `${panelWidth}px`,
  } as CSSProperties;

  return (
    <aside
      ref={panelRef}
      className={styles.panel}
      style={panelStyle}
      aria-label={`${node.label} 서머리`}
    >
      <div
        className={styles.resizeHandle}
        role="separator"
        aria-label="서머리 패널 너비 조절"
        aria-orientation="vertical"
        tabIndex={0}
        onPointerDown={handleResizeStart}
        onKeyDown={handleResizeKeyDown}
      />
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
                ? <SummaryDocument summary={summary} runId={runId} artifactUrls={artifactUrls} />
                : <SummaryState node={node} error={error} isLoading={isLoading} />}
            </div>
            <div className={styles.composerDock}>
              <PromptComposer
                isGenerating={false}
                onSend={onBranchPromptSend}
                clarification={null}
                analysisReview={null}
                isSubmittingAnalysisReview={false}
                analysisReviewError={null}
                onAnalysisReviewDecision={async () => undefined}
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
