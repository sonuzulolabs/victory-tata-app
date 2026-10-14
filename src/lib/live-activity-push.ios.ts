import { addPushToStartTokenListener, type LiveActivity } from 'expo-widgets';
import type { EventSubscription } from 'react-native';

import { registerLiveActivityPushTokens } from '@/lib/api/testing';
import type { VisitTrackingActivityProps } from '@/widgets/VisitTrackingLiveActivity';

const pushTokenSubs = new WeakMap<LiveActivity<VisitTrackingActivityProps>, EventSubscription>();

export function subscribeLiveActivityPushToStart(phone10: string): () => void {
  const sub = addPushToStartTokenListener((event) => {
    const token = event.activityPushToStartToken?.trim();
    if (!token) return;
    void registerLiveActivityPushTokens({
      phone: phone10,
      pushToStartToken: token,
    }).catch(() => {});
  });

  return () => sub.remove();
}

export async function attachLiveActivityPushToken(
  phone10: string,
  driveId: number,
  instance: LiveActivity<VisitTrackingActivityProps>,
): Promise<void> {
  const send = async (activityPushToken: string) => {
    if (!activityPushToken.trim()) return;
    await registerLiveActivityPushTokens({
      phone: phone10,
      driveId,
      activityPushToken: activityPushToken.trim(),
    });
  };

  const existing = pushTokenSubs.get(instance);
  existing?.remove();

  const token = await instance.getPushToken();
  if (token) {
    await send(token).catch(() => {});
  }

  pushTokenSubs.set(
    instance,
    instance.addPushTokenListener((event) => {
      void send(event.pushToken).catch(() => {});
    }),
  );
}
