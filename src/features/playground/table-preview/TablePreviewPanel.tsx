import { useInfiniteQuery } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Folder,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type UIEvent as ReactUIEvent,
} from 'react';

import { downloadSessionTableCsv, previewSessionTable } from '@/features/session/api';
import type { SessionTablePreviewResponse, SortOrder } from '@/features/session/types';

import styles from './TablePreviewPanel.module.css';

type Props = {
  sessionId: string;
  table: string;
  onClose: () => void;
};

type TableRow = Record<string, unknown>;

const ID_COLUMN_PATTERN = /(^id$|_id$)/i;
const MAX_COLUMN_WIDTH = 240;
const MIN_COLUMN_WIDTH = 96;
const COLUMN_GAP = 24;
const TABLE_INNER_WIDTH = 880;
const ROW_INLINE_PADDING = 16;
const MIN_SCROLLBAR_THUMB_WIDTH = 48;
const PAGE_SIZE = 50;
const ROW_HEIGHT = 48;

type ScrollbarMetrics = {
  hasOverflow: boolean;
  thumbOffset: number;
  thumbWidth: number;
};

type TableTransitionPhase = 'entering' | 'exiting' | 'idle' | 'initial';

const TABLE_EXIT_DURATION = 180;
const TABLE_ENTER_DURATION = 280;
const INITIAL_REVEAL_DURATION = 520;
const PANEL_CLOSE_DURATION = 420;

function formatCellValue(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getColumnWidth(column: string, rows: TableRow[]) {
  if (ID_COLUMN_PATTERN.test(column)) return MAX_COLUMN_WIDTH;

  const longestValueLength = rows.reduce((longest, row) => {
    return Math.max(longest, formatCellValue(row[column]).length);
  }, column.length);

  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longestValueLength * 8 + 16));
}

export function TablePreviewPanel({ sessionId, table, onClose }: Props) {
  const [displayedTable, setDisplayedTable] = useState(table);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [transitionPhase, setTransitionPhase] = useState<TableTransitionPhase>('initial');
  const [isClosing, setIsClosing] = useState(false);
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  const [scrollbar, setScrollbar] = useState<ScrollbarMetrics>({
    hasOverflow: false,
    thumbOffset: 0,
    thumbWidth: 0,
  });
  const tableViewportRef = useRef<HTMLDivElement>(null);
  const scrollbarDragRef = useRef({ pointerId: -1, startScrollLeft: 0, startX: 0 });
  const displayedPreviewRef = useRef({ sessionId, table });
  const sortingScopeRef = useRef(`${sessionId}:${table}`);
  const lastScrollTopRef = useRef(0);
  const closeTimerRef = useRef<number>();

  const sortingScope = `${sessionId}:${table}`;
  const effectiveSorting = sortingScopeRef.current === sortingScope ? sorting : [];
  const activeSort = effectiveSorting[0];
  const sortBy = activeSort?.id;
  const sortOrder: SortOrder = activeSort?.desc ? 'desc' : 'asc';

  const previewQuery = useInfiniteQuery({
    queryKey: ['session-table-preview', sessionId, table, sortBy ?? null, sortOrder],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => previewSessionTable({
      sessionId,
      table,
      limit: PAGE_SIZE,
      sortBy,
      sortOrder,
      cursor: pageParam,
      signal,
    }),
    getNextPageParam: (lastPage: SessionTablePreviewResponse) => (
      lastPage.page_info.has_more ? lastPage.page_info.next_cursor ?? undefined : undefined
    ),
    placeholderData: (previousData, previousQuery) => {
      const previousKey = previousQuery?.queryKey;
      const isSameTable = previousKey?.[1] === sessionId && previousKey?.[2] === table;
      return isSameTable ? previousData : undefined;
    },
    staleTime: 5 * 60_000,
    gcTime: 60_000,
  });

  const pages = previewQuery.data?.pages ?? [];
  const columns = pages[0]?.columns ?? [];
  const rows = useMemo(() => pages.flatMap((page) => page.rows), [pages]);
  const firstPageRows = pages[0]?.rows ?? [];

  const columnDefinitions = useMemo<ColumnDef<TableRow>[]>(() => (
    columns.map((column) => ({
      id: column,
      accessorFn: (row) => row[column],
      header: column,
      cell: (context) => formatCellValue(context.getValue()),
    }))
  ), [columns]);

  const tableModel = useReactTable({
    // 실제 행은 virtualizer가 직접 읽는다. 전체 row model 생성은 큰 테이블에서 불필요하다.
    data: [],
    columns: columnDefinitions,
    state: { sorting: effectiveSorting },
    onSortingChange: setSorting,
    manualSorting: true,
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel(),
  });

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableViewportRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const topSpacer = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const bottomSpacer = virtualRows.length > 0
    ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : rowVirtualizer.getTotalSize();

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
    const requestedPreview = { sessionId, table };
    const isDisplayedPreview =
      displayedPreviewRef.current.sessionId === sessionId && displayedPreviewRef.current.table === table;
    if (isDisplayedPreview) return;

    sortingScopeRef.current = sortingScope;
    setSorting([]);
    setTransitionPhase('exiting');

    const exitTimer = window.setTimeout(() => {
      displayedPreviewRef.current = requestedPreview;
      setDisplayedTable(table);
      tableViewportRef.current?.scrollTo({ top: 0, left: 0 });
      setTransitionPhase('entering');
    }, TABLE_EXIT_DURATION);
    const enterTimer = window.setTimeout(() => setTransitionPhase('idle'), TABLE_EXIT_DURATION + TABLE_ENTER_DURATION);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(enterTimer);
    };
  }, [sessionId, sortingScope, table]);

  useEffect(() => {
    if (transitionPhase !== 'initial') return;

    const timer = window.setTimeout(() => setTransitionPhase('idle'), INITIAL_REVEAL_DURATION);
    return () => window.clearTimeout(timer);
  }, [transitionPhase]);

  useEffect(() => {
    lastScrollTopRef.current = 0;
    tableViewportRef.current?.scrollTo({ top: 0 });
  }, [sortBy, sortOrder]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      requestClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  const tableLayout = useMemo(() => {
    if (columns.length === 0) return null;

    const widths = columns.map((column) => getColumnWidth(column, firstPageRows));
    const gapsWidth = Math.max(0, columns.length - 1) * COLUMN_GAP;
    const contentWidth = widths.reduce((sum, width) => sum + width, 0);

    return {
      columns: widths.map((width) => `${width}px`).join(' '),
      width: Math.max(TABLE_INNER_WIDTH, contentWidth + gapsWidth + ROW_INLINE_PADDING),
    };
  }, [columns, firstPageRows]);

  const updateScrollbar = useCallback(() => {
    const viewport = tableViewportRef.current;
    if (!viewport) return;

    const { clientWidth, scrollLeft, scrollWidth } = viewport;
    const maxScrollLeft = scrollWidth - clientWidth;
    const hasOverflow = maxScrollLeft > 1;

    if (!hasOverflow) {
      setScrollbar((current) => {
        if (!current.hasOverflow && current.thumbWidth === clientWidth) return current;
        return { hasOverflow: false, thumbOffset: 0, thumbWidth: clientWidth };
      });
      return;
    }

    const thumbWidth = Math.max(MIN_SCROLLBAR_THUMB_WIDTH, (clientWidth / scrollWidth) * clientWidth);
    const maxThumbOffset = clientWidth - thumbWidth;
    const thumbOffset = (scrollLeft / maxScrollLeft) * maxThumbOffset;

    setScrollbar((current) => {
      if (
        current.hasOverflow
        && Math.abs(current.thumbOffset - thumbOffset) < 0.5
        && Math.abs(current.thumbWidth - thumbWidth) < 0.5
      ) {
        return current;
      }
      return { hasOverflow: true, thumbOffset, thumbWidth };
    });
  }, []);

  useEffect(() => {
    const viewport = tableViewportRef.current;
    if (!viewport || !tableLayout) return;

    const frame = window.requestAnimationFrame(updateScrollbar);
    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(viewport);

    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [tableLayout, updateScrollbar]);

  const handleViewportScroll = (event: ReactUIEvent<HTMLDivElement>) => {
    updateScrollbar();
    const viewport = event.currentTarget;
    const isScrollingDown = viewport.scrollTop > lastScrollTopRef.current;
    lastScrollTopRef.current = viewport.scrollTop;
    if (!isScrollingDown || viewport.scrollTop <= 0) return;

    const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (remaining < ROW_HEIGHT * 8 && previewQuery.hasNextPage && !previewQuery.isFetchingNextPage) {
      void previewQuery.fetchNextPage();
    }
  };

  const handleSortColumn = (column: string) => {
    setSorting((current) => {
      const selected = current[0];
      if (selected?.id === column) return [{ id: column, desc: !selected.desc }];
      return [{ id: column, desc: false }];
    });
  };

  const clearSorting = () => {
    setSorting([]);
  };

  const handleCsvDownload = async () => {
    if (isDownloadingCsv) return;
    setIsDownloadingCsv(true);
    try {
      const blob = await downloadSessionTableCsv({
        sessionId,
        table: displayedTable,
        sortBy,
        sortOrder,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${displayedTable}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      console.error('CSV 다운로드 실패:', error);
    } finally {
      setIsDownloadingCsv(false);
    }
  };

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

  const initialError = previewQuery.isError && rows.length === 0
    ? previewQuery.error instanceof Error ? previewQuery.error.message : '조회에 실패했습니다.'
    : null;
  const nextPageError = previewQuery.isFetchNextPageError && rows.length > 0;

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
          <div className={styles.sortControl}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.sortStatusButton} ${activeSort ? `${styles.actionButtonActive} ${styles.clearSortButton}` : ''}`}
              disabled={!activeSort || previewQuery.isPlaceholderData}
              title={activeSort ? '정렬 해제' : '컬럼 라벨을 눌러 정렬'}
              aria-label={activeSort ? `${activeSort.id} 정렬 해제` : '정렬 없음'}
              onClick={clearSorting}
            >
              <span className={styles.sortLabel}>{activeSort?.id ?? 'Sort By'}</span>
              {activeSort ? (
                <span className={styles.sortStatusIcon} aria-hidden="true">
                  <>
                    {activeSort.desc
                      ? <ChevronDown className={styles.sortDirectionIcon} />
                      : <ChevronUp className={styles.sortDirectionIcon} />}
                    <X className={styles.sortClearIcon} />
                  </>
                </span>
              ) : null}
            </button>
          </div>

          <div className={styles.actionGroup}>
            <button type="button" className={styles.actionButton}>
              <MessageSquareText aria-hidden="true" />
              <span>Prompt</span>
            </button>
            <button
              type="button"
              className={styles.actionButton}
              disabled={isDownloadingCsv}
              aria-busy={isDownloadingCsv}
              onClick={() => void handleCsvDownload()}
            >
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
          {previewQuery.isPlaceholderData ? (
            <div className={styles.sortingOverlay} role="status" aria-live="polite">
              <LoaderCircle aria-hidden="true" />
              <span>전체 행 정렬 중...</span>
            </div>
          ) : null}
          {initialError ? (
            <div className={styles.errorState} role="alert">
              <p className={`${styles.stateMessage} ${styles.error}`}>{initialError}</p>
              <button type="button" className={styles.retryButton} onClick={() => void previewQuery.refetch()}>
                <RotateCcw aria-hidden="true" />
                <span>다시 시도</span>
              </button>
            </div>
          ) : null}
          {previewQuery.isPending ? <p className={styles.stateMessage}>불러오는 중...</p> : null}
          {!previewQuery.isPending && !initialError && rows.length === 0 ? (
            <p className={styles.stateMessage}>표시할 데이터가 없습니다.</p>
          ) : null}

          {rows.length > 0 && tableLayout ? (
            <>
              <div
                id="table-preview-viewport"
                ref={tableViewportRef}
                className={styles.tableViewport}
                tabIndex={0}
                onScroll={handleViewportScroll}
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
                  {tableModel.getHeaderGroups().map((headerGroup) => (
                    <div key={headerGroup.id} className={styles.headerRow} role="row">
                      {headerGroup.headers.map((header) => (
                        <div
                          key={header.id}
                          className={styles.headerCell}
                          role="columnheader"
                          aria-sort={
                            activeSort?.id === header.column.id
                              ? activeSort.desc ? 'descending' : 'ascending'
                              : 'none'
                          }
                          title={header.column.id}
                        >
                          <button
                            type="button"
                            className={styles.headerSortButton}
                            title={
                              activeSort?.id === header.column.id
                                ? `다시 누르면 ${activeSort.desc ? '오름차순' : '내림차순'}으로 정렬합니다.`
                                : `${header.column.id} 오름차순 정렬`
                            }
                            onClick={() => handleSortColumn(header.column.id)}
                          >
                            <span className={styles.headerSortLabel}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                            {activeSort?.id === header.column.id ? (
                              activeSort.desc
                                ? <ChevronDown aria-hidden="true" />
                                : <ChevronUp aria-hidden="true" />
                            ) : (
                              <ChevronsUpDown aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div role="rowgroup">
                    {topSpacer > 0 ? <div style={{ height: `${topSpacer}px` }} aria-hidden="true" /> : null}
                    {virtualRows.map((virtualRow) => {
                      const row = rows[virtualRow.index];
                      return (
                        <div key={virtualRow.index} className={styles.dataRow} role="row">
                          {columns.map((column) => {
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
                      );
                    })}
                    {bottomSpacer > 0 ? <div style={{ height: `${bottomSpacer}px` }} aria-hidden="true" /> : null}
                    {previewQuery.isFetchingNextPage ? <p className={styles.loadingMore}>다음 행을 불러오는 중...</p> : null}
                    {nextPageError ? (
                      <button type="button" className={styles.loadMoreError} onClick={() => void previewQuery.fetchNextPage()}>
                        다음 행을 불러오지 못했습니다. 다시 시도
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {scrollbar.hasOverflow ? (
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
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
