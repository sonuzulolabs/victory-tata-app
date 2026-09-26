import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getAuth, GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth';

type GoogleAccount = {
  name: string;
  email: string;
};

/** Web client from google-services.json (client_type 3). */
const WEB_CLIENT_ID = '235759569190-bh0t7dnf1gr1c4rqju25k8b036usec4h.apps.googleusercontent.com';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
}

export async function signInWithGoogleAccount(): Promise<GoogleAccount | null> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') return null;

    const idToken = response.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
    if (!idToken) {
      throw new Error('Google did not return a sign-in token.');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(getAuth(), credential);
    return {
      name: result.user.displayName ?? response.data.user.name ?? '',
      email: result.user.email ?? response.data.user.email,
    };
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';
    if (code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw error;
  }
}

export async function signOutGoogleAuth(): Promise<void> {
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // No Google session to clear.
  }
}
