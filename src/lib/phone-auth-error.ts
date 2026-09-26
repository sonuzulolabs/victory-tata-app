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
    case 'auth/quota-exceeded':
      return 'SMS quota reached. Try again later.';
    case 'auth/network-request-failed':
      return 'Check your connection and try again.';
    default:
      if (error instanceof Error && error.message) return error.message;
      return 'Could not complete phone sign-in.';
  }
}
