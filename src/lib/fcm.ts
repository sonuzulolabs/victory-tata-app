/** Web / unsupported platforms — no FCM. */
export async function syncFcmDeviceToken(_phone: string): Promise<void> {}

export function subscribeToFcmMessages(_onEta: (etaMinutes: number, status: string) => void): () => void {
  return () => {};
}

export function onFcmTokenRefresh(_handler: (token: string) => void): () => void {
  return () => {};
}
