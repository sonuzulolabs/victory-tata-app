import type { ActiveInstantTracking } from '@/lib/api/testing';

/** Match server InstantTestDrive::currentEtaMinutes() using eta_started_at. */
export function computeEtaMinutes(active: ActiveInstantTracking): number {
  if (!active.eta_started_at) {
    return active.initial_eta_minutes;
  }
  const started = new Date(active.eta_started_at).getTime();
  if (Number.isNaN(started)) {
    return active.eta_minutes;
  }
  const elapsed = Math.floor((Date.now() - started) / 60_000);
  return Math.max(0, active.initial_eta_minutes - elapsed);
}
