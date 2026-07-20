const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// AuthContext와 동일한 키 — 여기서 직접 읽어서 순환 import(auth → apiClient → auth)를 피한다
const AUTH_STORAGE_KEY = 'daaat.auth';

type ApiClientOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

// 백엔드가 4xx/5xx로 응답하면 던지는 에러 (message = FastAPI의 detail)
export class BackendApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
  }
}

// 저장된 토큰이 있으면 Authorization 헤더로 변환
function authHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const { token } = JSON.parse(raw) as { token?: string };
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // 저장값이 깨졌으면 그냥 인증 없이 진행 (요청은 401로 자연스럽게 처리됨)
  }
  return {};
}

// 공통 요청 처리: JSON 직렬화 → fetch → 상태코드 검사
async function fetchResponse(path: string, options: ApiClientOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  Object.entries(authHeader()).forEach(([key, value]) => headers.set(key, value)); // 모든 요청에 토큰 자동 부착
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  // 새 백엔드는 실패를 HTTP 상태코드로 알린다 (400 잘못된 입력 / 502 원격 MySQL 실패 / 422 형식 오류)
  if (!response.ok) {
    if (response.status === 401) {
      // 토큰 만료/위조 — 로컬 로그인 상태를 지우고 로그인 화면으로 보낸다
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') {
        message = body.detail; // 우리가 routes에서 넣은 에러 메시지
      } else if (Array.isArray(body.detail)) {
        // 422 검증 에러는 detail이 배열: [{msg: "...", loc: [...]}, ...]
        message = body.detail.map((d: { msg?: string }) => d.msg).join(', ');
      }
    } catch {
      // 본문이 JSON이 아니면 상태코드 메시지 그대로 사용
    }
    throw new BackendApiError(response.status, message);
  }

  return response;
}

async function request<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const response = await fetchResponse(path, options);
  return (await response.json()) as T;
}

export const apiClient = {
  get<T>(path: string, options?: ApiClientOptions) {
    return request<T>(path, { ...options, method: 'GET' });
  },

  post<T>(path: string, body: unknown, options?: ApiClientOptions) {
    return request<T>(path, { ...options, method: 'POST', body });
  },

  stream(path: string, options?: ApiClientOptions) {
    return fetchResponse(path, { ...options, method: 'GET' });
  },
};
