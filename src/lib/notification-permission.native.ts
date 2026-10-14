import { PermissionsAndroid, Platform } from 'react-native';

import { emitPostNotificationsReady } from '@/lib/post-notifications-ready';

export async function hasPostNotificationsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 33) return true;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

/** Request if needed; returns whether notifications may be shown. Emits ready when granted. */
export async function ensurePostNotificationsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 33) {
    emitPostNotificationsReady();
    return true;
  }

  if (await hasPostNotificationsPermission()) {
    emitPostNotificationsReady();
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
  if (allowed) {
    // Let the activity settle after the system permission sheet closes (avoids ANR).
    await new Promise((resolve) => setTimeout(resolve, 500));
    emitPostNotificationsReady();
  }
  return allowed;
}
