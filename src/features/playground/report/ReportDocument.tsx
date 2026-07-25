import type { Report, ReportTable } from './reportData';
import styles from './ReportDocument.module.css';

function DataTable({ columns, rows, caption }: ReportTable) {
  return (
    <div className={styles.tableWrap}>
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.join('-')}-${rowIndex}`}>
              {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
    </div>
  );
}

export function ReportDocument({ report }: { report: Report }) {
  const document = report.document;
  if (!document) return null;

  const profile = document.dataProfile ?? [
    `${document.sampleLabel}을 분석 대상으로 사용했습니다.`,
    `분석 기간은 ${document.period}입니다.`,
  ];
  const qualityIssues = document.qualityIssues ?? [
    '주문별 중복 리뷰와 핵심 변수 결측치를 제거한 뒤 분석 표본을 확정했습니다.',
  ];
  const hypotheses = document.hypotheses ?? document.sections.map((section) => (
    `${section.title}에서 관찰된 패턴이 기간 외 검증 표본에서도 유지될 것입니다.`
  ));

  return (
    <div className={styles.document}>
      <header className={styles.documentHeader}>
        <span className={styles.kind}>EDA</span>
        <h2>{report.title}</h2>
        <p className={styles.subtitle}>{document.subtitle}</p>
      </header>

      <section>
        <h3>분석 배경</h3>
        <div className={styles.sectionBody}>
          {document.executiveSummary.slice(0, 2).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section>
        <h3>데이터마트 프로파일</h3>
        <ul className={styles.profileList}>
          {profile.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section>
        <h3>데이터 품질</h3>
        <ul className={styles.compactList}>
          {qualityIssues.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section>
        <h3>통계적 발견</h3>
        <div className={styles.findingStack}>
          {document.sections.map((finding, index) => (
            <article className={styles.finding} key={finding.id}>
              <h4>{index + 1}. {finding.title}</h4>
              {finding.chart ? (
                <figure>
                  <img src={finding.chart.src} alt={finding.chart.alt} />
                  <figcaption>
                    <strong>{finding.chart.caption}</strong>
                    <span>{finding.chart.source}</span>
                  </figcaption>
                </figure>
              ) : null}
              {finding.lede ? <p className={styles.rationale}>근거: {finding.lede}</p> : null}
              {finding.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {finding.table ? <DataTable {...finding.table} /> : null}
              {finding.callout ? (
                <div className={styles.findingNote}>
                  <strong>{finding.callout.label}{finding.callout.value ? ` · ${finding.callout.value}` : ''}</strong>
                  <p>{finding.callout.body}</p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3>제안 가설</h3>
        <div className={styles.hypothesisList}>
          {hypotheses.map((hypothesis, index) => (
            <article key={hypothesis}>
              <h4>{index + 1}. {hypothesis}</h4>
              <p>근거: 위 통계적 발견 {Math.min(index + 1, document.sections.length)}번에서 관찰된 패턴을 후속 분석에서 검증할 후보로 정리했습니다.</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3>결론</h3>
        <div className={styles.sectionBody}>
          <p>{document.conclusion ?? document.executiveSummary.at(-1)}</p>
        </div>
      </section>

      <section className={styles.caution}>
        <h3>주의사항</h3>
        <ul className={styles.compactList}>
          {(document.limitations ?? [
            '본 결과는 테스트용 합성 데이터의 관찰 패턴이며 실제 운영 적용 전 검증이 필요합니다.',
          ]).map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </div>
  );
}
