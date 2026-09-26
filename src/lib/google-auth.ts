export type GoogleAccount = {
  name: string;
  email: string;
};

/** Web and Expo Go have no native Google sign-in for this Android project. */
export async function signInWithGoogleAccount(): Promise<GoogleAccount | null> {
  throw new Error('Google sign-in runs in the Victory Tata Android app.');
}

export async function signOutGoogleAuth(): Promise<void> {}
