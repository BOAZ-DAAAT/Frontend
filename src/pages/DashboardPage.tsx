const dashboardCards = [
  {
    title: 'Datasources',
    value: '0',
    description: '연결된 데이터소스',
  },
  {
    title: 'Runs',
    value: '0',
    description: '최근 에이전트 실행',
  },
  {
    title: 'Artifacts',
    value: '0',
    description: '생성된 분석 결과물',
  },
];

export function DashboardPage() {
  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-brand-100">Dashboard</p>
        <h2 className="mt-2 text-3xl font-bold text-white">분석 작업 현황</h2>
        <p className="mt-3 text-slate-400">데이터소스, 실행 기록, 결과물을 한눈에 확인하는 화면입니다.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {dashboardCards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-slate-400">{card.title}</p>
            <strong className="mt-3 block text-4xl font-bold text-white">{card.value}</strong>
            <p className="mt-2 text-sm text-slate-500">{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
