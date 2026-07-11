import { useEffect, useState } from 'react';

import type { PreviewResponse } from '@/features/datasources/types';
import { previewSessionTable } from '@/features/session/api';

type Props = {
  sessionId: string;
  table: string;
  onClose: () => void;   // 부모(PlaygroundPage)가 "닫는 법"을 넘겨줌
};

// 사본 테이블 데이터를 표로 보여주는 오버레이 패널
export function TablePreviewPanel({ sessionId, table, onClose }: Props) {
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // session/table이 바뀔 때마다 해당 테이블 데이터를 새로 불러온다
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    previewSessionTable(sessionId, table)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '조회에 실패했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, table]);

  return (
    // 배경(어두운 막) 클릭 시 닫힘
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-8"
      onClick={onClose}
    >
      {/* 패널 내부 클릭은 닫힘으로 번지지 않게 차단 */}
      <div
        className="max-h-full w-full max-w-4xl overflow-auto rounded-2xl border border-white/10 bg-slate-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{table}</h2>
          <button className="text-sm text-slate-400 hover:text-white" onClick={onClose}>
            ✕ 닫기
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {!data && !error && <p className="mt-4 text-sm text-slate-400">불러오는 중...</p>}

        {data && (
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr>
                {data.columns.map((col) => (
                  <th key={col} className="border-b border-white/10 px-3 py-2 text-left font-medium text-slate-300">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="hover:bg-white/5">
                  {data.columns.map((col) => (
                    <td key={col} className="border-b border-white/5 px-3 py-2 text-slate-200">
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
