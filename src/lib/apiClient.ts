import type { ApiResult } from '@/types/common';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

type ApiClientOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export class BackendApiError extends Error {
  code: string;
  details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'BackendApiError';
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const result = (await response.json()) as ApiResult<T>;

  if (!response.ok || !result.ok) {
    throw new BackendApiError(
      result.error?.code ?? 'HTTP_ERROR',
      result.error?.message ?? 'API request failed.',
      result.error?.details ?? {},
    );
  }

  return result.data as T;
}

export const apiClient = {
  get<T>(path: string, options?: ApiClientOptions) {
    return request<T>(path, { ...options, method: 'GET' });
  },

  post<T>(path: string, body: unknown, options?: ApiClientOptions) {
    return request<T>(path, { ...options, method: 'POST', body });
  },
};
