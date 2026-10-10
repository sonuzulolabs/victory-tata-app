import type { UserProfile } from '@/context/user-profile';

export type AuthRequiredPrompt = {
  message: string;
};

type Listener = (prompt: AuthRequiredPrompt | null) => void;

let listener: Listener | null = null;
let pending: AuthRequiredPrompt | null = null;

/** Used by `AuthRequiredHost` to receive sign-in prompts. */
export function subscribeAuthRequired(next: Listener): () => void {
  listener = next;
  if (pending) {
    next(pending);
    pending = null;
  }
  return () => {
    if (listener === next) {
      listener = null;
    }
  };
}

function showAuthRequired(message: string): void {
  const prompt: AuthRequiredPrompt = { message };
  if (listener) {
    listener(prompt);
    return;
  }
  pending = prompt;
}

/**
 * Returns true when the user is signed in.
 * Otherwise shows the sign-in dialog and returns false.
 */
export function requireAuth(
  profile: UserProfile | null,
  message = 'Please sign in or sign up to continue.',
): boolean {
  if (profile) {
    return true;
  }

  showAuthRequired(message);
  return false;
}
