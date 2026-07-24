import type { Report } from './reportData';

const reportsBySessionId = new Map<string, Report[]>();

export function getCachedReports(sessionId: string): Report[] {
  return reportsBySessionId.get(sessionId) ?? [];
}

export function setCachedReports(sessionId: string, reports: Report[]): Report[] {
  const currentReports = reportsBySessionId.get(sessionId);
  const isUnchanged = currentReports?.length === reports.length
    && currentReports.every((current, index) => {
      const next = reports[index];
      return current.id === next.id
        && current.title === next.title
        && current.author === next.author
        && current.date === next.date
        && current.markdown === next.markdown;
    });

  if (isUnchanged && currentReports) return currentReports;

  reportsBySessionId.set(sessionId, reports);
  return reports;
}
