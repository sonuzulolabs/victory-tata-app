import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from '@react-native-firebase/auth';

let pending: ConfirmationResult | null = null;

export async function sendPhoneOtp(phone10: string): Promise<void> {
  pending = await signInWithPhoneNumber(getAuth(), `+91${phone10}`);
}

export async function confirmPhoneOtp(code: string): Promise<string | null> {
  if (!pending) {
    throw new Error('Request a code first.');
  }
  const result = await pending.confirm(code);
  pending = null;
  return result?.user.phoneNumber ?? null;
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
