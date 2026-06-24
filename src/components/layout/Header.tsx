export function Header() {
  return (
    <header className="border-b border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">DAAAT AI Agent</p>
          <h1 className="text-xl font-semibold text-white">Data Analyst Assistant</h1>
        </div>
        <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
          Backend: ready to connect
        </div>
      </div>
    </header>
  );
}
