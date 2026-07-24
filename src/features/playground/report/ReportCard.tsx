import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { FileText, X, type LucideIcon } from 'lucide-react';

import { getAgentRunArtifactContent } from '@/features/playground/node-summary/api';

import type { Report } from './reportData';
import type { GeneratedReport, ReportEvidenceTable } from './types';
import styles from './ReportCard.module.css';

type ReportCardProps = {
  report: Report;
  variant: 'thumbnail' | 'detail';
  onOpen?: () => void;
  onClose?: () => void;
  motionKey?: string;
  motionOrder?: number;
  transitionName?: string;
  documentContent?: ReactNode;
  className?: string;
  headerIcon?: LucideIcon;
  pathRoot?: string | null;
};

const REPORT_WIDTH = 640;
const DEFAULT_THUMBNAIL_WIDTH = 280;
const DEFAULT_THUMBNAIL_SCALE = DEFAULT_THUMBNAIL_WIDTH / REPORT_WIDTH;

type ThumbnailStyle = CSSProperties & {
  '--thumbnail-scale': number;
  viewTransitionName?: string;
};

function formatInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{renderCodeTerms(part.slice(2, -2), `bold-${index}`)}</strong>;
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className={styles.codeChip}>{part.slice(1, -1)}</code>;
    }

    return <Fragment key={index}>{renderCodeTerms(part, `plain-${index}`)}</Fragment>;
  });
}

function renderCodeTerms(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(
      <code key={`${keyPrefix}-${match.index}-${match[0]}`} className={styles.codeChip}>
        {match[0]}
      </code>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : [text];
}

function parseTable(lines: string[], startIndex: number) {
  const rows: string[][] = [];
  let index = startIndex;

  while (index < lines.length && lines[index].trim().startsWith('|')) {
    const line = lines[index].trim();
    const cells = line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

    const isSeparator = cells.every((cell) => /^:?-{3,}:?$/.test(cell));
    if (!isSeparator) rows.push(cells);
    index += 1;
  }

  return { rows, nextIndex: index };
}

const SQL_TOKEN_PATTERN = /(--.*?$|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:[^"]|"")*"|\b(?:ADD|ALTER|AND|AS|ASC|AVG|BY|CASE|CAST|COUNT|CREATE|DATE|DATE_FORMAT|DAY|DELETE|DESC|DISTINCT|ELSE|END|FROM|GROUP|HAVING|IN|INNER|INSERT|INTO|IS|JOIN|LEFT|LIMIT|MAX|MIN|NOT|NULL|ON|OR|ORDER|OUTER|OVER|PARTITION|RIGHT|ROW_NUMBER|SELECT|SET|SUM|TABLE|THEN|TIMESTAMPDIFF|UPDATE|WHEN|WHERE|WITH)\b|\b\d+(?:\.\d+)?\b)/gim;

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

function MarkdownContent({ markdown }: { markdown: string }) {
  const lines = markdown.trim().split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(' ');
    blocks.push(<p key={`p-${blocks.length}`}>{formatInlineMarkdown(text)}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {list.map((item) => (
          <li key={item}>{formatInlineMarkdown(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith('```')) {
      flushParagraph();
      flushList();
      const language = line.slice(3).trim().toLowerCase();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      const code = codeLines.join('\n');
      blocks.push(language === 'sql'
        ? <SqlCodeBlock key={`code-${blocks.length}`} code={code} />
        : (
          <pre key={`code-${blocks.length}`} className={styles.codeBlock}>
            <code>{code}</code>
          </pre>
        ));
      continue;
    }

    if (line.startsWith('|')) {
      flushParagraph();
      flushList();
      const { rows, nextIndex } = parseTable(lines, index);
      const [head, ...body] = rows;

      if (head) {
        blocks.push(
          <div className={styles.tableWrap} key={`table-${blocks.length}`}>
            <table>
              <thead>
                <tr>
                  {head.map((cell) => (
                    <th key={cell}>{formatInlineMarkdown(cell)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rowIndex) => (
                  <tr key={`${row.join('-')}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${cell}-${cellIndex}`}>{formatInlineMarkdown(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }

      index = nextIndex - 1;
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push(<h3 key={`h-${blocks.length}`}>{formatInlineMarkdown(line.slice(3))}</h3>);
      continue;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push(<h4 key={`h-${blocks.length}`}>{formatInlineMarkdown(line.slice(4))}</h4>);
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return <div className={styles.markdown}>{blocks}</div>;
}

function ReportParagraphs({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{formatInlineMarkdown(paragraph)}</p>
      ))}
    </>
  );
}

function ReportSection({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.reportSection}>
      <p className={styles.sectionKicker}>{kicker}</p>
      <h3>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function ReportChartImage({ runId, artifactId }: { runId?: string; artifactId: string }) {
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
  return <img className={styles.chartImage} src={imageUrl} alt="report chart artifact" />;
}

function EvidenceTableView({ table }: { table: ReportEvidenceTable }) {
  const rows = table.rows.slice(0, 5);
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (!rows.length || !columns.length) return null;

  return (
    <article className={styles.evidenceTableCard}>
      <div className={styles.evidenceTableHeader}>
        <strong>{table.title}</strong>
        {table.source_label || table.stage ? (
          <span>{table.source_label ?? table.stage}</span>
        ) : null}
      </div>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={column}>{String(row[column] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function findingSortPriority(heading: string) {
  const normalized = heading.toLowerCase();
  if (normalized.includes('퍼널') || normalized.includes('병목') || normalized.includes('funnel')) return 0;
  if (normalized.includes('방법') || normalized.includes('검정') || normalized.includes('진단')) return 1;
  return 2;
}

function orderedFindings(findings: GeneratedReport['key_findings']) {
  return findings
    .map((finding, index) => ({ finding, index }))
    .sort((left, right) => {
      const priorityDiff = findingSortPriority(left.finding.heading) - findingSortPriority(right.finding.heading);
      return priorityDiff || left.index - right.index;
    })
    .map(({ finding }) => finding);
}

function StructuredReportContent({ report, generated }: { report: Report; generated: GeneratedReport }) {
  const evidenceTables = generated.evidence_tables ?? [];
  const findings = orderedFindings(generated.key_findings);

  return (
    <div className={`${styles.content} ${styles.structuredContent}`}>
      <div className={styles.metaRow}>
        <span className={styles.author}>{report.author}</span>
        <time className={styles.date}>{report.date}</time>
      </div>

      <p className={styles.reportEyebrow}>DAAAT · NODE REPORT</p>
      <h2 className={styles.title}>{generated.title}</h2>
      <p className={styles.abstract}>{generated.key_finding}</p>

      <ReportSection kicker="EXECUTIVE SUMMARY" title="핵심 요약">
        <p className={styles.formalLead}>본 분석은 다음의 핵심 결과를 확인합니다.</p>
        <ReportParagraphs text={generated.executive_summary} />
      </ReportSection>

      <ReportSection kicker="BACKGROUND" title="배경 및 질문">
        <ReportParagraphs text={generated.background_and_question} />
      </ReportSection>

      <ReportSection kicker="METHODOLOGY" title="방법론">
        <p className={styles.formalLead}>이에 본 보고서는 산출된 마트와 탐색 결과를 기반으로 후속 검정 및 해석 절차를 수행합니다.</p>
        <ReportParagraphs text={generated.methodology_narrative} />
      </ReportSection>

      <ReportSection kicker="MAIN ANALYSIS" title="본 분석">
        <div className={styles.findingStack}>
          {findings.map((finding, index) => (
            <article key={`${finding.heading}-${index}`} className={styles.findingCard}>
              <h4>{formatInlineMarkdown(finding.heading)}</h4>
              {finding.source_label ? <p className={styles.findingSource}>{finding.source_label}</p> : null}
              <ReportParagraphs text={finding.body} />
              {finding.chart_artifact_ids.length ? (
                <div className={styles.chartGrid}>
                  {finding.chart_artifact_ids.map((artifactId) => (
                    <ReportChartImage key={artifactId} runId={report.runId} artifactId={artifactId} />
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </ReportSection>

      {evidenceTables.length ? (
        <ReportSection kicker="EVIDENCE DATA" title="근거 데이터">
          <p className={styles.formalLead}>아래 표는 각 아티팩트에서 확인된 정형 근거의 상위 5행입니다.</p>
          <div className={styles.evidenceTableStack}>
            {evidenceTables.map((table, index) => (
              <EvidenceTableView key={`${table.title}-${index}`} table={table} />
            ))}
          </div>
        </ReportSection>
      ) : null}

      {generated.code_used.trim() ? (
        <ReportSection kicker="SQL" title="사용한 쿼리">
          <SqlCodeBlock code={generated.code_used.trim()} />
        </ReportSection>
      ) : null}

      {generated.limitations.length ? (
        <ReportSection kicker="CAVEATS" title="한계 및 유의사항">
          <ul>
            {generated.limitations.map((item, index) => (
              <li key={`${item}-${index}`}>{formatInlineMarkdown(item)}</li>
            ))}
          </ul>
        </ReportSection>
      ) : null}

      <ReportSection kicker="CONCLUSION" title="결론 및 제언">
        <ReportParagraphs text={generated.conclusion_and_recommendations} />
      </ReportSection>
    </div>
  );
}

function ReportContent({ report }: { report: Report }) {
  if (report.generated) {
    return <StructuredReportContent report={report} generated={report.generated} />;
  }

  return (
    <div className={styles.content}>
      <div className={styles.metaRow}>
        <span className={styles.author}>{report.author}</span>
        <time className={styles.date}>{report.date}</time>
      </div>

      <h2 className={styles.title}>{report.title}</h2>
      <MarkdownContent markdown={report.markdown} />
    </div>
  );
}

export function ReportCard({
  report,
  variant,
  onOpen,
  onClose,
  motionKey,
  motionOrder,
  transitionName,
  documentContent,
  className,
  headerIcon: HeaderIcon = FileText,
  pathRoot = 'Report',
}: ReportCardProps) {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const thumbnailDocumentRef = useRef<HTMLElement>(null);
  const [thumbnailMetrics, setThumbnailMetrics] = useState({
    height: 224,
    scale: DEFAULT_THUMBNAIL_SCALE,
  });

  useLayoutEffect(() => {
    if (variant !== 'thumbnail') return;

    const thumbnail = thumbnailRef.current;
    const document = thumbnailDocumentRef.current;
    if (!thumbnail || !document) return;

    let frame = 0;
    const updateMetrics = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const scale = thumbnail.clientWidth / REPORT_WIDTH;
        const height = Math.ceil(document.offsetHeight * scale);

        setThumbnailMetrics((current) => {
          if (current.height === height && current.scale === scale) return current;
          return { height, scale };
        });
      });
    };

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(thumbnail);
    observer.observe(document);
    updateMetrics();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [variant]);

  const contents = (
    <>
      <header className={styles.header}>
        <div className={styles.path}>
          <HeaderIcon className={styles.reportIcon} aria-hidden="true" />
          {pathRoot ? (
            <>
              <span className={styles.pathRoot}>{pathRoot}</span>
              <span className={styles.separator}>/</span>
            </>
          ) : null}
          <span className={styles.pathTitle}>{report.title}</span>
        </div>

        {variant === 'detail' ? (
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="리포트 닫기"
          >
            <X aria-hidden="true" />
          </button>
        ) : (
          <span className={styles.closeButton} aria-hidden="true">
            <X />
          </span>
        )}
      </header>

      <div className={styles.surface}>
        {documentContent === undefined ? <ReportContent report={report} /> : documentContent}
      </div>
    </>
  );

  if (variant === 'thumbnail') {
    const thumbnailStyle: ThumbnailStyle = {
      '--thumbnail-scale': thumbnailMetrics.scale,
      height: thumbnailMetrics.height,
      viewTransitionName: transitionName,
    };

    return (
      <div
        ref={thumbnailRef}
        className={styles.thumbnail}
        style={thumbnailStyle}
        data-report-motion-key={motionKey}
        data-report-motion-order={motionOrder}
        onClick={(event) => event.stopPropagation()}
      >
        <article
          ref={thumbnailDocumentRef}
          className={`${styles.card} ${styles.thumbnailDocument}`}
        >
          {contents}
        </article>

        <button
          type="button"
          className={styles.thumbnailButton}
          onClick={onOpen}
          aria-label={`${report.title} 리포트 열기`}
        />
      </div>
    );
  }

  return (
    <article
      className={`${styles.card} ${styles.detail} ${className ?? ''}`}
      style={{ viewTransitionName: transitionName } as CSSProperties}
      onClick={(event) => event.stopPropagation()}
    >
      {contents}
    </article>
  );
}
