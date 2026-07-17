import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
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

function ReportContent({ report }: { report: Report }) {
  return (
    <div className={styles.content}>
      <div className={styles.metaRow}>
        <span className={styles.author}>{report.author}</span>
        <time className={styles.date}>{report.date}</time>
      </div>

      <h2 className={styles.title}>{report.title}</h2>
      <p className={styles.greeting}>{report.greeting}</p>

      <div className={styles.copy}>
        {report.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <p className={styles.signoff}>{report.signoff}</p>
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
            aria-label="레포트 닫기"
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
          aria-label={`${report.title} 레포트 열기`}
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
