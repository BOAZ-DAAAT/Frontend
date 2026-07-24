import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import { useSidebar } from '@/features/playground/sidebar/SidebarContext';
import { getCurrentSessionId } from '@/features/session/currentSession';

import { listAgentReports } from './api';
import { ReportCard } from './ReportCard';
import { getCachedReports, setCachedReports } from './reportCache';
import type { Report } from './reportData';
import { toUiReport } from './reportAdapter';
import { REPORTS_UPDATED_EVENT } from './reportEvents';
import styles from './ReportWorkspace.module.css';

const COLUMN_COUNT = 3;
const STAGGER_STEP_MS = 36;
const MAX_STAGGER_SPAN_MS = 240;
const REPORT_MOTION_DURATION_MS = 560;
const SELECTED_REPORT_MOTION_DURATION_MS = 620;
const REPORT_MOTION_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const REPORT_EXIT_EASING = 'cubic-bezier(0.4, 0.12, 0.7, 1)';

type ReportItem = {
  report: Report;
  order: number;
  transitionName: string;
};

type ReportViewTransition = {
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ReportViewTransition;
};

type ReportTravelMeasurement = {
  motionKey: string;
  order: number;
  thumbnail: HTMLElement;
  travelX: number;
  travelY: number;
};

function getStaggerStep(itemCount: number) {
  return itemCount > 1
    ? Math.min(STAGGER_STEP_MS, MAX_STAGGER_SPAN_MS / (itemCount - 1))
    : 0;
}

function measureReportTravel(): ReportTravelMeasurement[] {
  const thumbnails = Array.from(
    document.querySelectorAll<HTMLElement>('[data-report-motion-key]'),
  );
  const thumbnailRects = thumbnails.map((thumbnail) => ({
    thumbnail,
    rect: thumbnail.getBoundingClientRect(),
  }));
  const tallestThumbnailHeight = thumbnailRects.reduce((tallest, { rect }) => {
    return Math.max(tallest, rect.height);
  }, 0);
  const targetX = window.innerWidth / 2;
  const targetY = window.innerHeight + tallestThumbnailHeight / 2 + 96;

  return thumbnailRects.flatMap(({ thumbnail, rect }) => {
    const motionKey = thumbnail.dataset.reportMotionKey;
    const order = Number(thumbnail.dataset.reportMotionOrder);
    if (!motionKey || !Number.isFinite(order)) return [];

    return [{
      motionKey,
      order,
      thumbnail,
      travelX: targetX - (rect.left + rect.width / 2),
      travelY: targetY - (rect.top + rect.height / 2),
    }];
  });
}

function updateReportTravelOffsets() {
  const rootStyle = document.documentElement.style;

  measureReportTravel().forEach(({ motionKey, travelX, travelY }) => {
    rootStyle.setProperty(`--${motionKey}-travel-x`, `${travelX}px`);
    rootStyle.setProperty(`--${motionKey}-travel-y`, `${travelY}px`);
  });
}

function createReportTransitionStyles(reportItems: ReportItem[]) {
  const staggerStep = getStaggerStep(reportItems.length);

  const transitionRules = reportItems.map(({ order, transitionName }) => {
    const enterDelay = Math.round(order * staggerStep);

    return `
::view-transition-group(${transitionName}) {
  z-index: 900;
  --report-travel-x: var(--${transitionName}-travel-x, 0px);
  --report-travel-y: var(--${transitionName}-travel-y, 100vh);
}

::view-transition-old(${transitionName}) {
  animation:
    report-list-exit-down
    var(--report-list-exit-duration, ${REPORT_MOTION_DURATION_MS}ms)
    var(--report-list-exit-easing, ${REPORT_EXIT_EASING})
    0ms
    both;
}

::view-transition-new(${transitionName}) {
  animation: report-list-enter-up ${REPORT_MOTION_DURATION_MS}ms ${REPORT_MOTION_EASING} ${enterDelay}ms both;
}`;
  }).join('\n');

  return `
@keyframes report-list-exit-down {
  from {
    filter: blur(0);
    transform: translateY(0);
  }

  18% {
    filter: blur(10px);
  }

  65% {
    filter: blur(5px);
  }

  to {
    filter: blur(0);
    transform: translate(var(--report-travel-x), var(--report-travel-y));
  }
}

@keyframes report-list-enter-up {
  from {
    transform: translate(var(--report-travel-x), var(--report-travel-y));
  }

  to {
    transform: translateY(0);
  }
}

${transitionRules}
`;
}

export function ReportWorkspace() {
  const { selectedItemId, beginCollapse, collapse } = useSidebar();
  const [availableReports, setAvailableReports] = useState<Report[]>(() => {
    const sessionId = getCurrentSessionId();
    return sessionId ? getCachedReports(sessionId) : [];
  });
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [transitionReportId, setTransitionReportId] = useState<string | null>(null);
  const [isClosingWorkspace, setIsClosingWorkspace] = useState(false);
  const previousSidebarSelectionRef = useRef(selectedItemId);
  const transitionInProgressRef = useRef(false);

  const reportItems = useMemo<ReportItem[]>(() => {
    return availableReports.map((report, order) => ({
      report,
      order,
      transitionName: `report-item-${order + 1}`,
    }));
  }, [availableReports]);

  useEffect(() => {
    let cancelled = false;
    const sessionId = getCurrentSessionId();
    if (!sessionId) return () => { cancelled = true; };

    const loadReports = () => {
      void listAgentReports(sessionId)
        .then((response) => {
          if (cancelled) return;
          const nextReports = response.reports.map(toUiReport);
          setAvailableReports(setCachedReports(sessionId, nextReports));
        })
        .catch(() => {
          // 실제 리포트를 불러오지 못하면 빈 목록을 유지한다.
        });
    };

    loadReports();
    window.addEventListener(REPORTS_UPDATED_EVENT, loadReports);
    return () => {
      cancelled = true;
      window.removeEventListener(REPORTS_UPDATED_EVENT, loadReports);
    };
  }, []);

  const reportTransitionStyles = useMemo(() => {
    return createReportTransitionStyles(reportItems);
  }, [reportItems]);

  const reportColumns = useMemo(() => {
    const columns = Array.from(
      { length: COLUMN_COUNT },
      () => [] as ReportItem[],
    );

    reportItems.forEach((item) => {
      columns[item.order % COLUMN_COUNT].push(item);
    });

    return columns;
  }, [reportItems]);

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let animations: Animation[] = [];
    const frame = window.requestAnimationFrame(() => {
      const measurements = measureReportTravel().sort((a, b) => a.order - b.order);
      const staggerStep = getStaggerStep(measurements.length);

      animations = measurements.map(({ order, thumbnail, travelX, travelY }) => {
        return thumbnail.animate(
          [
            { transform: `translate(${travelX}px, ${travelY}px)` },
            { transform: 'translate(0, 0)' },
          ],
          {
            duration: REPORT_MOTION_DURATION_MS,
            delay: Math.round(order * staggerStep),
            easing: REPORT_MOTION_EASING,
            fill: 'both',
          },
        );
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
    };
  }, [reportItems]);

  const runReportTransition = useCallback((reportId: string, nextReportId: string | null) => {
    if (transitionInProgressRef.current) return;

    const transitionDocument = document as ViewTransitionDocument;
    const startViewTransition = transitionDocument.startViewTransition?.bind(transitionDocument);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!startViewTransition || prefersReducedMotion) {
      setSelectedReportId(nextReportId);
      return;
    }

    transitionInProgressRef.current = true;
    flushSync(() => setTransitionReportId(reportId));
    updateReportTravelOffsets();

    try {
      const transition = startViewTransition(() => {
        flushSync(() => setSelectedReportId(nextReportId));
        updateReportTravelOffsets();
      });

      transition.finished.finally(() => {
        transitionInProgressRef.current = false;
        setTransitionReportId(null);
      });
    } catch {
      transitionInProgressRef.current = false;
      setTransitionReportId(null);
      setSelectedReportId(nextReportId);
    }
  }, []);

  const closeSelectedReport = useCallback(() => {
    if (!selectedReportId) return;
    runReportTransition(selectedReportId, null);
  }, [runReportTransition, selectedReportId]);

  useEffect(() => {
    const previousSelection = previousSidebarSelectionRef.current;
    previousSidebarSelectionRef.current = selectedItemId;

    if (selectedItemId === previousSelection) return;
    if (selectedItemId && availableReports.some((report) => report.id === selectedItemId)) {
      runReportTransition(selectedItemId, selectedItemId);
    }
  }, [availableReports, runReportTransition, selectedItemId]);

  useEffect(() => {
    if (!selectedReportId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSelectedReport();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSelectedReport, selectedReportId]);

  const selectedReport = availableReports.find((report) => report.id === selectedReportId) ?? null;

  const closeReportWorkspace = () => {
    if (transitionInProgressRef.current) return;

    const transitionDocument = document as ViewTransitionDocument;
    const startViewTransition = transitionDocument.startViewTransition?.bind(transitionDocument);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!startViewTransition || prefersReducedMotion || !reportItems.length) {
      collapse();
      return;
    }

    transitionInProgressRef.current = true;
    updateReportTravelOffsets();
    flushSync(beginCollapse);
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty(
      '--report-list-exit-duration',
      `${SELECTED_REPORT_MOTION_DURATION_MS}ms`,
    );
    rootStyle.setProperty('--report-list-exit-easing', REPORT_MOTION_EASING);

    const clearWorkspaceExitTiming = () => {
      rootStyle.removeProperty('--report-list-exit-duration');
      rootStyle.removeProperty('--report-list-exit-easing');
    };

    try {
      const transition = startViewTransition(() => {
        flushSync(() => setIsClosingWorkspace(true));
      });

      transition.finished.finally(() => {
        clearWorkspaceExitTiming();
        transitionInProgressRef.current = false;
        collapse();
      });
    } catch {
      clearWorkspaceExitTiming();
      transitionInProgressRef.current = false;
      collapse();
    }
  };

  const handleBackgroundClick = () => {
    if (selectedReportId) {
      closeSelectedReport();
      return;
    }

    closeReportWorkspace();
  };

  return (
    <section className={styles.workspace} aria-label="저장된 레포트">
      <style>{reportTransitionStyles}</style>

      <div
        className={`${styles.blurLayer} ${
          isClosingWorkspace ? styles.blurLayerClosing : ''
        }`}
        aria-hidden="true"
        onClick={handleBackgroundClick}
      />

      <div className={styles.reportArea} onClick={handleBackgroundClick}>
        {selectedReport ? (
          <div className={styles.viewer}>
            <ReportCard
              report={selectedReport}
              variant="detail"
              onClose={closeSelectedReport}
              transitionName="selected-report"
            />
          </div>
        ) : (
          <div className={styles.gallery}>
            {!isClosingWorkspace ? reportColumns.map((column, columnIndex) => (
              <div key={columnIndex} className={styles.reportColumn}>
                {column.map(({ order, report, transitionName }) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    variant="thumbnail"
                    onOpen={() => runReportTransition(report.id, report.id)}
                    motionKey={transitionName}
                    motionOrder={order}
                    transitionName={
                      transitionReportId === report.id
                        ? 'selected-report'
                        : transitionName
                    }
                  />
                ))}
              </div>
            )) : null}
          </div>
        )}
      </div>
    </section>
  );
}
