import type { UserProfile } from '@/context/user-profile';

/** Web / builds without Firebase native auth. */
export async function waitForFirebaseAuthReady(): Promise<void> {}

export function firebaseSessionProfile(): UserProfile | null {
  return null;
}
