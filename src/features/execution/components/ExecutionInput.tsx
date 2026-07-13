type ExecutionInputProps = {
  query: string;
  isSubmitting: boolean;
  error: string | null;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
};

export function ExecutionInput({
  query,
  isSubmitting,
  error,
  onQueryChange,
  onSubmit,
}: ExecutionInputProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <h3 className="text-lg font-semibold text-white">분석 요청</h3>
      <p className="mt-2 text-sm text-slate-400">질문이나 SQL 실행 요청을 입력하는 영역입니다.</p>

      <textarea
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="mt-6 min-h-72 w-full rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-500"
        placeholder="ex. 지난 3개월 매출 추이를 분석해줘"
      />

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <div className="mt-4 flex justify-end">
        <button
          className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? '실행 중...' : '실행하기'}
        </button>
      </div>
    </div>
  );
}
