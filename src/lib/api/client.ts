import { apiKey, apiOrigin } from '@/lib/api/config';

type Envelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const key = apiKey();
  if (!key) {
    throw new ApiError(
      'Missing API key. Set EXPO_PUBLIC_API_KEY in .env.local and restart Expo.',
      401,
    );
  }

  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${key}`);
  if (init?.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}/api/v1${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Cannot reach Victory CRM. Check that the API server is running.', 0);
  }

  let payload: Envelope<T> | null = null;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message || 'Request failed', response.status);
  }

  return payload.data;
}

/** Testing module routes live at /api/testing/v1 (not under /api/v1). */
export async function testingApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const key = apiKey();
  if (!key) {
    throw new ApiError(
      'Missing API key. Set EXPO_PUBLIC_API_KEY in .env.local and restart Expo.',
      401,
    );
  }

  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${key}`);
  if (init?.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}/api/testing/v1${normalizedPath}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError('Cannot reach Victory CRM. Check that the API server is running.', 0);
  }

  let payload: Envelope<T> | null = null;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message || 'Request failed', response.status);
  }

  return payload.data;
}
