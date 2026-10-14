/**
 * Must load early so Android can receive data messages when the app is backgrounded.
 */
import messaging from '@react-native-firebase/messaging';

import { updateFromInstantDrivePushData } from '@/lib/visit-status-notification';

try {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    if (remoteMessage.data) {
      await updateFromInstantDrivePushData(
        remoteMessage.data as Record<string, string | undefined>,
      );
    }
  });
} catch {
  // Native module unavailable (e.g. web bundle).
}
