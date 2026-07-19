import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { FileText, X } from 'lucide-react';

import type { Report } from './reportData';
import styles from './ReportCard.module.css';

type ReportCardProps = {
  report: Report;
  variant: 'thumbnail' | 'detail';
  onOpen?: () => void;
  onClose?: () => void;
  motionKey?: string;
  motionOrder?: number;
  transitionName?: string;
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
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
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

function ReportContent({ report }: { report: Report }) {
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
          <FileText className={styles.reportIcon} aria-hidden="true" />
          <span className={styles.pathRoot}>Report</span>
          <span className={styles.separator}>/</span>
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
        <ReportContent report={report} />
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
      className={`${styles.card} ${styles.detail}`}
      style={{ viewTransitionName: transitionName } as CSSProperties}
      onClick={(event) => event.stopPropagation()}
    >
      {contents}
    </article>
  );
}
