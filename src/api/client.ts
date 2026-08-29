const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:5168';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                          => request<T>(path),
  post:   <T>(path: string, body: unknown)           => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)           => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: <T = void>(path: string)                  => request<T>(path, { method: 'DELETE' }),
};
