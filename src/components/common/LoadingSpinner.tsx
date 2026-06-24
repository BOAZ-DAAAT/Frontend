export function LoadingSpinner() {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-300">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
      Loading...
    </div>
  );
}
