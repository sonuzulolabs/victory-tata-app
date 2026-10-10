/** Local Victory CRM. Override with EXPO_PUBLIC_API_URL if the host changes. */
const DEFAULT_API_ORIGIN = 'http://127.0.0.1:8000';

/** Origin the app calls, without a path. */
export function apiOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  const origin = configured || DEFAULT_API_ORIGIN;
  return origin.replace(/\/$/, '').replace(/\/api\/v1$/, '').replace(/\/login$/, '');
}

export function apiKey(): string {
  return process.env.EXPO_PUBLIC_API_KEY?.trim() ?? '';
}

/** Point storage URLs at the same host the app uses for the API. */
export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const origin = new URL(apiOrigin());
    const parsed = new URL(url, origin);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      parsed.protocol = origin.protocol;
      parsed.hostname = origin.hostname;
      parsed.port = origin.port;
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
