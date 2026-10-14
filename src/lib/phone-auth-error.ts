export function phoneAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Enter a valid mobile number.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/invalid-verification-code':
      return 'That code is incorrect.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'That code expired. Request a new one.';
    case 'auth/missing-client-identifier':
      return 'This Android build is not registered with Firebase yet.';
    case 'auth/app-not-authorized':
      return 'This Android install cannot verify with Google Play. Use a new preview build, or install from Play Store.';
    case 'auth/billing-not-enabled':
      return 'Phone sign-in needs billing enabled on the Firebase project (Blaze plan). Ask your admin to upgrade in Firebase Console, or use a test phone number while developing.';
    case 'auth/quota-exceeded':
      return 'SMS quota reached. Try again later.';
    case 'auth/network-request-failed':
      return 'Check your connection and try again.';
    default:
      if (error instanceof Error && /billing-not-enabled/i.test(error.message)) {
        return 'Phone sign-in needs billing enabled on the Firebase project (Blaze plan). See Firebase Console → Upgrade.';
      }
      if (error instanceof Error && /play_integrity/i.test(error.message)) {
        return 'This Android install cannot verify with Google Play. Use a new preview build, or install from Play Store.';
      }
      if (error instanceof Error && error.message) return error.message;
      return 'Could not complete phone sign-in.';
  }
}
