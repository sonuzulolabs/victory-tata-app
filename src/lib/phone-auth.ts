/** Web and Expo Go have no native Firebase phone auth for this Android project. */
export async function sendPhoneOtp(_phone10: string): Promise<void> {
  throw new Error('Phone OTP is sent from the Victory Tata Android app.');
}

export async function confirmPhoneOtp(_code: string): Promise<string | null> {
  throw new Error('Phone OTP is verified in the Victory Tata Android app.');
}

export async function getFirebaseIdToken(): Promise<string> {
  throw new Error('Account deletion OTP is verified in the Victory Tata app build.');
}

export async function signOutPhoneAuth(): Promise<void> {}

export function subscribePhoneUser(_phone10: string, _onMatch: () => void): () => void {
  return () => {};
}
