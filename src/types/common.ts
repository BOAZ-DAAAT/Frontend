export type ApiErrorPayload = {
  code: string;
  message: string;
  details: Record<string, unknown>;
};

export type ApiResult<T> = {
  ok: boolean;
  data: T | null;
  error: ApiErrorPayload | null;
};
