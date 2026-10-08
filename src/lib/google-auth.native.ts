import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getAuth, GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth';
import { Platform } from 'react-native';

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

async function ensureGooglePlayServices(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
}

export async function signInWithGoogleAccount(): Promise<GoogleAccount | null> {
  ensureConfigured();
  await ensureGooglePlayServices();

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

    const message =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
    if (code === '10' || /developer_error/i.test(message)) {
      const hint =
        Platform.OS === 'ios'
          ? 'On iOS, add the iOS app in Firebase (bundle com.zulolabs.victorytata), enable Google sign-in, replace GoogleService-Info.plist, then rebuild. See ./scripts/setup-ios-firebase-plist.sh'
          : 'On Android, add the SHA-1 of your APK signing key in Firebase for package com.zulolabs.victorytata, enable Google sign-in, replace google-services.json, then rebuild. Run: ./scripts/google-signin-firebase-sha.sh';
      throw new Error(`Google Sign-In is not set up for this app install. ${hint}`);
    }

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
