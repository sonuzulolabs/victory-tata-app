import type { LiveActivity } from 'expo-widgets';

import type { VisitTrackingActivityProps } from '@/widgets/VisitTrackingLiveActivity';

export function subscribeLiveActivityPushToStart(_phone10: string): () => void {
  return () => {};
}

export async function attachLiveActivityPushToken(
  _phone10: string,
  _driveId: number,
  _instance: LiveActivity<VisitTrackingActivityProps>,
): Promise<void> {}
