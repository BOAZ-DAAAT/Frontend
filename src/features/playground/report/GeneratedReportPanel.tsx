import { X } from 'lucide-react';

import { BlobOrb } from '@/pages/BlobPage';

import { ReportCard } from './ReportCard';
import { toUiReport } from './reportAdapter';
import type { AgentNodeReportResponse } from './types';
import styles from './GeneratedReportPanel.module.css';

type Props = {
  data: AgentNodeReportResponse | null;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
};

export function GeneratedReportPanel({ data, error, isLoading, onClose }: Props) {
  const report = data ? toUiReport(data) : null;

  return (
    <section className={styles.workspace} aria-label="리포트 생성 결과">
      <button type="button" className={styles.backdrop} onClick={onClose} aria-label="리포트 닫기" />
      <div className={styles.content}>
        {report ? (
          <ReportCard report={report} variant="detail" onClose={onClose} />
        ) : (
          <div className={styles.statusPanel} role={error ? 'alert' : 'status'}>
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
              <X aria-hidden="true" />
            </button>
            {isLoading ? (
              <span className={styles.reportBlob} aria-hidden="true">
                <BlobOrb speed={0.46} />
              </span>
            ) : null}
            <strong>{isLoading ? '리포트를 작성하고 있습니다' : '리포트를 생성하지 못했습니다'}</strong>
            <p>{isLoading ? '선택한 인사이트까지의 분석 흐름을 정리하는 중입니다.' : error}</p>
          </div>
        )}
      </div>
    </section>
  );
}
