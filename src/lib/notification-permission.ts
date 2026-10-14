import { emitPostNotificationsReady } from '@/lib/post-notifications-ready';

export async function hasPostNotificationsPermission(): Promise<boolean> {
  return true;
}

export async function ensurePostNotificationsPermission(): Promise<boolean> {
  emitPostNotificationsReady();
  return true;
}
