import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserProfile } from '@/context/user-profile';

const STORAGE_KEY = 'victory_user_profile_v1';

export async function loadStoredUserProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (parsed.authMethod !== 'phone' && parsed.authMethod !== 'google') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveStoredUserProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Keep in-memory session if disk write fails.
  }
}

export async function clearStoredUserProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // No-op.
  }
}
