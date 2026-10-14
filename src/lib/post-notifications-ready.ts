type Listener = () => void;

const listeners = new Set<Listener>();

/** FCM (or other) calls this after POST_NOTIFICATIONS is granted or already held. */
export function emitPostNotificationsReady(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore subscriber errors.
    }
  });
}

export function subscribePostNotificationsReady(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
