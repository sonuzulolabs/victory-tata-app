import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';

import type { UserProfile } from '@/context/user-profile';
import { formatPhoneInput } from '@/lib/phone';

function formatPhoneDisplay(phone10: string) {
  const formatted = formatPhoneInput(phone10);
  return formatted ? `+91 ${formatted}` : '';
}

export function firebaseSessionProfile(): UserProfile | null {
  const user = getAuth().currentUser;
  if (!user) return null;

  const phoneDigits = (user.phoneNumber ?? '').replace(/\D/g, '');
  if (phoneDigits.length >= 10) {
    const phone10 = phoneDigits.slice(-10);
    return {
      authMethod: 'phone',
      name: '',
      phone: formatPhoneDisplay(phone10),
      email: '',
      memberSince: '',
      city: '',
    };
  }

  const email = user.email?.trim() ?? '';
  if (email) {
    return {
      authMethod: 'google',
      name: user.displayName?.trim() ?? '',
      email,
      phone: '',
      memberSince: '',
      city: '',
    };
  }

  return null;
}

/** Resolves after the first Firebase auth state is known (restores persisted Firebase sessions). */
export function waitForFirebaseAuthReady(): Promise<void> {
  return new Promise((resolve) => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      resolve();
    });
  });
}
