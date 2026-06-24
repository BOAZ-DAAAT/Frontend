export function ApprovalActionButtons() {
  return (
    <div className="flex gap-2">
      <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white" type="button">
        승인
      </button>
      <button className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white" type="button">
        거절
      </button>
    </div>
  );
}
