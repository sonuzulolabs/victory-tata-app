import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from '@react-native-firebase/auth';
import { Platform } from 'react-native';

let pending: ConfirmationResult | null = null;

type NativeAuthSettings = {
  forceRecaptchaFlowForTesting: boolean;
};

/**
 * Sideloaded EAS preview/dev APKs get a Play Integrity token that Firebase rejects
 * (`Invalid app info in play_integrity_token`) even when SHA-1/SHA-256 match.
 * reCAPTCHA works without Play Store recognition. Production Play installs keep
 * the default Play Integrity flow.
 */
function preparePhoneAuth() {
  const auth = getAuth();
  const forceRecaptcha =
    Platform.OS === 'android' &&
    (__DEV__ || process.env.EXPO_PUBLIC_FIREBASE_FORCE_RECAPTCHA === '1');
  if (forceRecaptcha) {
    (auth.settings as unknown as NativeAuthSettings).forceRecaptchaFlowForTesting = true;
  }
  return auth;
}

export async function sendPhoneOtp(phone10: string): Promise<void> {
  pending = await signInWithPhoneNumber(preparePhoneAuth(), `+91${phone10}`);
}

export async function confirmPhoneOtp(code: string): Promise<string | null> {
  if (!pending) {
    throw new Error('Request a code first.');
  }
  const result = await pending.confirm(code);
  pending = null;
  return result?.user.phoneNumber ?? null;
}

export async function getFirebaseIdToken(): Promise<string> {
  const user = getAuth().currentUser;
  if (!user) {
    throw new Error('Verify OTP first.');
  }
  return user.getIdToken();
}

export async function signOutPhoneAuth(): Promise<void> {
  if (!getAuth().currentUser) return;
  await signOut(getAuth());
}

export function subscribePhoneUser(phone10: string, onMatch: () => void): () => void {
  return onAuthStateChanged(getAuth(), (user) => {
    const digits = (user?.phoneNumber ?? '').replace(/\D/g, '');
    if (digits.endsWith(phone10)) onMatch();
  });
}
