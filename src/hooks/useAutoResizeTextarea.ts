import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * textarea 높이를 입력 내용에 맞춰 자동 조절한다.
 * - 내용이 늘어나면 그만큼 높이가 커지고, 최대 `maxRows` 줄에서 멈춘다.
 * - 상한을 넘으면 내부 스크롤로 전환한다(스크롤바 숨김은 CSS에서 처리).
 *
 * @param maxRows 늘어날 수 있는 최대 줄 수 (기본 5)
 * @returns ref: textarea에 연결할 ref, resize: onInput 등에 연결할 높이 재계산 함수
 */
export function useAutoResizeTextarea(maxRows = 5) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    // 1) 높이를 초기화해 실제 내용 높이(scrollHeight)를 정확히 측정
    el.style.height = 'auto';

    // 2) 한 줄 높이 × maxRows 로 상한 계산
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const maxHeight = lineHeight * maxRows;

    // 3) 내용 높이와 상한 중 작은 값으로 설정, 넘치면 스크롤 허용
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [maxRows]);

  // 초기 렌더 시 1줄 높이로 맞춰 첫 프레임 깜빡임 방지
  useLayoutEffect(() => {
    resize();
  }, [resize]);

  return { ref, resize };
}
