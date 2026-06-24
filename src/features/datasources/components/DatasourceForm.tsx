export function DatasourceForm() {
  return (
    <form className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <h3 className="text-lg font-semibold text-white">데이터소스 등록</h3>
      <p className="mt-2 text-sm text-slate-400">실제 등록 로직은 API 연결 작업에서 구현합니다.</p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-slate-300">이름</span>
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-500"
            placeholder="ex. Analytics DB"
            type="text"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-300">타입</span>
          <select className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-500">
            <option>postgres</option>
            <option>mysql</option>
            <option>sqlite</option>
          </select>
        </label>

        <button
          className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          type="button"
        >
          연결 추가
        </button>
      </div>
    </form>
  );
}
