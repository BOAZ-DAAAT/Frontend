export const REPORTS_UPDATED_EVENT = 'daaat:reports-updated';

export function notifyReportsUpdated() {
  window.dispatchEvent(new Event(REPORTS_UPDATED_EVENT));
}
