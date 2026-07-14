import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ChevronDown, Download, Folder, MessageSquareText, X } from 'lucide-react';

import type { PreviewResponse } from '@/features/datasources/types';
import { previewSessionTable } from '@/features/session/api';

import styles from './TablePreviewPanel.module.css';

type Props = {
  sessionId: string;
  table: string;
  onClose: () => void;
};

const ID_COLUMN_PATTERN = /(^id$|_id$)/i;
const MAX_COLUMN_WIDTH = 240;
const MIN_COLUMN_WIDTH = 96;
const COLUMN_GAP = 24;
const TABLE_INNER_WIDTH = 880;
const ROW_INLINE_PADDING = 16;
const MIN_SCROLLBAR_THUMB_WIDTH = 48;

type ScrollbarMetrics = {
  hasOverflow: boolean;
  thumbOffset: number;
  thumbWidth: number;
};

type TableTransitionPhase = 'entering' | 'exiting' | 'idle' | 'initial';

type PreviewResult =
  | { data: PreviewResponse; error: null }
  | { data: null; error: string };

const TABLE_EXIT_DURATION = 180;
const TABLE_ENTER_DURATION = 280;
const INITIAL_REVEAL_DURATION = 520;
const PANEL_CLOSE_DURATION = 420;

function formatCellValue(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getColumnWidth(column: string, rows: PreviewResponse['rows']) {
  if (ID_COLUMN_PATTERN.test(column)) {
    return MAX_COLUMN_WIDTH;
  }

  const longestValueLength = rows.reduce((longest, row) => {
    return Math.max(longest, formatCellValue(row[column]).length);
  }, column.length);

  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longestValueLength * 8 + 16));
}

export function TablePreviewPanel({ sessionId, table, onClose }: Props) {
  const [displayedTable, setDisplayedTable] = useState(table);
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<TableTransitionPhase>('initial');
  const [isClosing, setIsClosing] = useState(false);
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
  const [scrollbar, setScrollbar] = useState<ScrollbarMetrics>({
    hasOverflow: false,
    thumbOffset: 0,
    thumbWidth: 0,
  });
  const tableViewportRef = useRef<HTMLDivElement>(null);
  const scrollbarDragRef = useRef({ pointerId: -1, startScrollLeft: 0, startX: 0 });
  const displayedPreviewRef = useRef({ sessionId, table });
  const hasLoadedDisplayedPreviewRef = useRef(false);
  const closeTimerRef = useRef<number>();

  const requestClose = useCallback(() => {
    if (closeTimerRef.current !== undefined) return;

    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(onClose, PANEL_CLOSE_DURATION);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== undefined) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let exitTimer: number | undefined;
    let enterTimer: number | undefined;
    const requestedPreview = { sessionId, table };
    const isDisplayedPreview =
      displayedPreviewRef.current.sessionId === sessionId && displayedPreviewRef.current.table === table;

    const loadPreview = (): Promise<PreviewResult> => {
      return previewSessionTable(sessionId, table)
        .then((response) => ({ data: response, error: null }))
        .catch((cause) => ({
          data: null,
          error: cause instanceof Error ? cause.message : '조회에 실패했습니다.',
        }));
    };

    if (isDisplayedPreview) {
      if (!hasLoadedDisplayedPreviewRef.current) {
        setData(null);
        setError(null);

        loadPreview().then((result) => {
          if (cancelled) return;
          hasLoadedDisplayedPreviewRef.current = true;
          setData(result.data);
          setError(result.error);
        });
      } else {
        setTransitionPhase('idle');
      }
    } else {
      loadPreview().then((result) => {
        if (cancelled) return;

        setTransitionPhase('exiting');
        exitTimer = window.setTimeout(() => {
          if (cancelled) return;

          displayedPreviewRef.current = requestedPreview;
          hasLoadedDisplayedPreviewRef.current = true;
          setDisplayedTable(table);
          setData(result.data);
          setError(result.error);
          setTransitionPhase('entering');

          enterTimer = window.setTimeout(() => {
            if (!cancelled) setTransitionPhase('idle');
          }, TABLE_ENTER_DURATION);
        }, TABLE_EXIT_DURATION);
      });
    }

    return () => {
      cancelled = true;
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
      if (enterTimer !== undefined) window.clearTimeout(enterTimer);
    };
  }, [sessionId, table]);

  useEffect(() => {
    if (transitionPhase !== 'initial') return;

    const timer = window.setTimeout(() => setTransitionPhase('idle'), INITIAL_REVEAL_DURATION);
    return () => window.clearTimeout(timer);
  }, [transitionPhase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  const tableLayout = useMemo(() => {
    if (!data) return null;

    const widths = data.columns.map((column) => getColumnWidth(column, data.rows));
    const gapsWidth = Math.max(0, data.columns.length - 1) * COLUMN_GAP;
    const contentWidth = widths.reduce((sum, width) => sum + width, 0);

    return {
      columns: widths.map((width) => `${width}px`).join(' '),
      width: Math.max(TABLE_INNER_WIDTH, contentWidth + gapsWidth + ROW_INLINE_PADDING),
    };
  }, [data]);

  const updateScrollbar = useCallback(() => {
    const viewport = tableViewportRef.current;
    if (!viewport) return;

    const { clientWidth, scrollLeft, scrollWidth } = viewport;
    const maxScrollLeft = scrollWidth - clientWidth;
    const hasOverflow = maxScrollLeft > 1;

    if (!hasOverflow) {
      setScrollbar({ hasOverflow: false, thumbOffset: 0, thumbWidth: clientWidth });
      return;
    }

    const thumbWidth = Math.max(MIN_SCROLLBAR_THUMB_WIDTH, (clientWidth / scrollWidth) * clientWidth);
    const maxThumbOffset = clientWidth - thumbWidth;
    const thumbOffset = (scrollLeft / maxScrollLeft) * maxThumbOffset;

    setScrollbar({ hasOverflow: true, thumbOffset, thumbWidth });
  }, []);

  useEffect(() => {
    const viewport = tableViewportRef.current;
    if (!viewport || !data) return;

    const frame = window.requestAnimationFrame(updateScrollbar);
    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(viewport);

    if (viewport.firstElementChild) {
      observer.observe(viewport.firstElementChild);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [data, tableLayout, updateScrollbar]);

  const handleScrollbarPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = tableViewportRef.current;
    if (!viewport) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollbarDragRef.current = {
      pointerId: event.pointerId,
      startScrollLeft: viewport.scrollLeft,
      startX: event.clientX,
    };
    setIsDraggingScrollbar(true);
  };

  const handleScrollbarPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = tableViewportRef.current;
    const drag = scrollbarDragRef.current;
    if (!viewport || drag.pointerId !== event.pointerId) return;

    const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
    const maxThumbOffset = viewport.clientWidth - scrollbar.thumbWidth;
    if (maxThumbOffset <= 0) return;

    viewport.scrollLeft = drag.startScrollLeft + ((event.clientX - drag.startX) / maxThumbOffset) * maxScrollLeft;
  };

  const stopScrollbarDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scrollbarDragRef.current.pointerId !== event.pointerId) return;

    scrollbarDragRef.current.pointerId = -1;
    setIsDraggingScrollbar(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleScrollbarTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = tableViewportRef.current;
    if (!viewport || event.target !== event.currentTarget) return;

    const trackRect = event.currentTarget.getBoundingClientRect();
    const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
    const maxThumbOffset = viewport.clientWidth - scrollbar.thumbWidth;
    const targetThumbOffset = Math.min(
      maxThumbOffset,
      Math.max(0, event.clientX - trackRect.left - scrollbar.thumbWidth / 2),
    );

    viewport.scrollTo({
      left: maxThumbOffset > 0 ? (targetThumbOffset / maxThumbOffset) * maxScrollLeft : 0,
      behavior: 'smooth',
    });
  };

  const gridStyle = tableLayout
    ? ({
        '--table-columns': tableLayout.columns,
        width: `${tableLayout.width}px`,
      } as CSSProperties)
    : undefined;

  return (
    <div className={styles.backdrop}>
      <div
        className={`${styles.blurLayer} ${isClosing ? styles.blurLayerClosing : ''}`}
        onClick={requestClose}
        aria-hidden="true"
      />

      <section
        className={`${styles.panel} ${isClosing ? styles.panelClosing : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.path} id="table-preview-title">
            <Folder className={styles.pathIcon} aria-hidden="true" />
            <span className={styles.source}>원본 데이터</span>
            <span className={styles.separator}>/</span>
            <span className={styles.tableNameViewport}>
              <span
                className={`${styles.tableName} ${
                  transitionPhase === 'exiting'
                    ? styles.tableNameExiting
                    : transitionPhase === 'entering'
                      ? styles.tableNameEntering
                      : ''
                }`}
              >
                {displayedTable}
              </span>
            </span>
          </div>

          <button type="button" className={styles.closeButton} onClick={requestClose} aria-label="테이블 닫기">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.actions}>
          <button type="button" className={styles.actionButton}>
            <span>Sort By</span>
            <ChevronDown aria-hidden="true" />
          </button>

          <div className={styles.actionGroup}>
            <button type="button" className={styles.actionButton}>
              <MessageSquareText aria-hidden="true" />
              <span>Prompt</span>
            </button>
            <button type="button" className={styles.actionButton}>
              <Download aria-hidden="true" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div
          className={`${styles.tableSurface} ${
            isClosing
              ? styles.tableSurfaceClosing
              : transitionPhase === 'initial'
                ? styles.tableSurfaceInitial
                : ''
          }`}
        >
          {error && <p className={`${styles.stateMessage} ${styles.error}`}>{error}</p>}
          {!data && !error && <p className={styles.stateMessage}>불러오는 중...</p>}

          {data && tableLayout && (
            <>
              <div
                id="table-preview-viewport"
                ref={tableViewportRef}
                className={styles.tableViewport}
                tabIndex={0}
                onScroll={updateScrollbar}
              >
                <div
                  className={`${styles.tableGrid} ${
                    transitionPhase === 'exiting'
                      ? styles.tableTextExiting
                      : transitionPhase === 'entering'
                        ? styles.tableTextEntering
                        : ''
                  }`}
                  style={gridStyle}
                  role="table"
                  aria-label={`${displayedTable} 데이터`}
                >
                  <div className={styles.headerRow} role="row">
                    {data.columns.map((column) => (
                      <div key={column} className={styles.headerCell} role="columnheader" title={column}>
                        {column}
                      </div>
                    ))}
                  </div>

                  <div role="rowgroup">
                    {data.rows.map((row, rowIndex) => (
                      <div key={rowIndex} className={styles.dataRow} role="row">
                        {data.columns.map((column) => {
                          const value = formatCellValue(row[column]);
                          const isId = ID_COLUMN_PATTERN.test(column);
                          const idTail = isId ? value.slice(-8) : '';
                          const idHead = isId ? value.slice(0, Math.max(0, value.length - idTail.length)) : '';

                          return (
                            <div
                              key={column}
                              className={`${styles.dataCell} ${isId ? styles.idCell : ''}`}
                              role="cell"
                              title={value}
                            >
                              {isId && value.length > 8 ? (
                                <span className={styles.middleEllipsis}>
                                  <span className={styles.middleEllipsisHead}>{idHead}</span>
                                  <span className={styles.middleEllipsisTail}>{idTail}</span>
                                </span>
                              ) : (
                                value
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {scrollbar.hasOverflow && (
                <div
                  className={`${styles.scrollbarTrack} ${isDraggingScrollbar ? styles.scrollbarDragging : ''}`}
                  onPointerDown={handleScrollbarTrackPointerDown}
                  aria-hidden="true"
                >
                  <div
                    className={styles.scrollbarThumb}
                    style={{
                      width: `${scrollbar.thumbWidth}px`,
                      transform: `translateX(${scrollbar.thumbOffset}px)`,
                    }}
                    onPointerDown={handleScrollbarPointerDown}
                    onPointerMove={handleScrollbarPointerMove}
                    onPointerUp={stopScrollbarDrag}
                    onPointerCancel={stopScrollbarDrag}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
