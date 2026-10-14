import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { fetchCustomer, saveCustomer, type SavedCustomer } from '@/lib/api';
import { firebaseSessionProfile, waitForFirebaseAuthReady } from '@/lib/auth-session';
import { signOutGoogleAuth } from '@/lib/google-auth';
import { signOutPhoneAuth } from '@/lib/phone-auth';
import { formatPhoneInput, isValidIndianMobile, mobileDigitsFromStored } from '@/lib/phone';
import {
  clearStoredUserProfile,
  loadStoredUserProfile,
  saveStoredUserProfile,
} from '@/lib/user-profile-storage';

export type AuthMethod = 'phone' | 'google';

export type UserProfile = {
  authMethod: AuthMethod;
  name: string;
  phone: string;
  email: string;
  memberSince: string;
  city: string;
};

type UserProfileContextValue = {
  profile: UserProfile | null;
  /** False until saved session / Firebase auth has been restored on launch. */
  sessionReady: boolean;
  signInWithPhone: (phone10: string) => void;
  signInWithGoogle: (account: { name: string; email: string }) => void;
  updateProfile: (patch: Partial<Pick<UserProfile, 'name' | 'phone' | 'email' | 'city'>>) => void;
  refreshFromServer: () => Promise<void>;
  signOut: () => void;
  isFieldLocked: (field: 'name' | 'phone' | 'email') => boolean;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Initials only after Google sign-in with a name. Otherwise the app shows a profile icon. */
export function googleInitials(profile: UserProfile | null): string | null {
  if (profile?.authMethod !== 'google') return null;
  const name = profile.name.trim();
  if (!name) return null;
  return initialsFromName(name);
}

function formatPhoneDisplay(phone10: string) {
  const formatted = formatPhoneInput(phone10);
  return formatted ? `+91 ${formatted}` : '';
}

function mergeServerCustomer(prev: UserProfile, customer: SavedCustomer): UserProfile {
  const serverName = customer.name.trim();
  const usableName = serverName && serverName.toLowerCase() !== 'customer' ? serverName : '';
  return {
    ...prev,
    name: prev.name.trim() || usableName,
    email: prev.email.trim() || customer.email,
    city: customer.city || prev.city,
    memberSince: customer.memberSince || prev.memberSince,
  };
}

function mergeStoredWithFirebase(stored: UserProfile, firebase: UserProfile | null): UserProfile {
  if (!firebase) return stored;
  if (stored.authMethod === 'phone' && firebase.authMethod === 'phone') {
    return { ...stored, phone: stored.phone.trim() ? stored.phone : firebase.phone };
  }
  if (stored.authMethod === 'google' && firebase.authMethod === 'google') {
    return {
      ...stored,
      name: stored.name.trim() || firebase.name,
      email: stored.email.trim() || firebase.email,
    };
  }
  return stored;
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const syncCustomer = useCallback(async (next: UserProfile) => {
    const phone = mobileDigitsFromStored(next.phone);
    if (!isValidIndianMobile(phone)) return;

    const localName = next.name.trim();
    const nameForApi = localName.length >= 2 ? localName : 'Customer';

    try {
      const saved = await saveCustomer({
        name: nameForApi,
        phone,
        email: next.email.trim() || undefined,
        city: next.city.trim() || undefined,
      });
      setProfile((prev) => (prev ? mergeServerCustomer(prev, saved) : prev));
    } catch {
      // Keep the local session if Victory CRM is unreachable.
    }
  }, []);

  const signInWithPhone = useCallback(
    (phone10: string) => {
      const next: UserProfile = {
        authMethod: 'phone',
        name: '',
        phone: formatPhoneDisplay(phone10),
        email: '',
        memberSince: '',
        city: '',
      };
      setProfile(next);
      void saveStoredUserProfile(next);
      void syncCustomer(next);
    },
    [syncCustomer],
  );

  const signInWithGoogle = useCallback((account: { name: string; email: string }) => {
    const next: UserProfile = {
      authMethod: 'google',
      name: account.name,
      email: account.email,
      phone: '',
      memberSince: '',
      city: '',
    };
    setProfile(next);
    void saveStoredUserProfile(next);
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Pick<UserProfile, 'name' | 'phone' | 'email' | 'city'>>) => {
      setProfile((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        if (prev.authMethod === 'phone') {
          next.phone = prev.phone;
        }
        if (prev.authMethod === 'google') {
          next.name = prev.name;
          next.email = prev.email;
        }
        void saveStoredUserProfile(next);
        void syncCustomer(next);
        return next;
      });
    },
    [syncCustomer],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await waitForFirebaseAuthReady();
      const [stored, firebase] = await Promise.all([
        loadStoredUserProfile(),
        Promise.resolve(firebaseSessionProfile()),
      ]);

      let restored: UserProfile | null = null;
      if (stored) {
        restored = mergeStoredWithFirebase(stored, firebase);
      } else if (firebase) {
        restored = firebase;
      }

      if (cancelled) return;

      if (restored) {
        setProfile(restored);
        void saveStoredUserProfile(restored);
        void syncCustomer(restored);

        const phone = mobileDigitsFromStored(restored.phone);
        if (isValidIndianMobile(phone)) {
          try {
            const customer = await fetchCustomer(phone);
            if (!cancelled) {
              setProfile((prev) => (prev ? mergeServerCustomer(prev, customer) : prev));
            }
          } catch {
            // Offline or CRM unreachable — keep restored session.
          }
        }
      }

      if (!cancelled) setSessionReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [syncCustomer]);

  const refreshFromServer = useCallback(async () => {
    const phone = mobileDigitsFromStored(profile?.phone ?? '');
    if (!isValidIndianMobile(phone)) return;
    try {
      const customer = await fetchCustomer(phone);
      setProfile((prev) => {
        if (!prev) return prev;
        const serverName = customer.name.trim();
        const usableName = serverName && serverName.toLowerCase() !== 'customer' ? serverName : '';
        const merged = {
          ...prev,
          name: usableName || prev.name,
          email: customer.email || prev.email,
          city: customer.city || prev.city,
          memberSince: customer.memberSince || prev.memberSince,
        };
        void saveStoredUserProfile(merged);
        return merged;
      });
    } catch {
      // Keep the session already on the phone.
    }
  }, [profile?.phone]);

  const signOut = useCallback(() => {
    setProfile(null);
    void clearStoredUserProfile();
    void signOutPhoneAuth();
    void signOutGoogleAuth();
  }, []);

  const isFieldLocked = useCallback(
    (field: 'name' | 'phone' | 'email') => {
      if (!profile) return false;
      if (profile.authMethod === 'phone' && field === 'phone') return true;
      if (profile.authMethod === 'google' && (field === 'name' || field === 'email')) return true;
      return false;
    },
    [profile],
  );

  const value = useMemo(
    () => ({
      profile,
      sessionReady,
      signInWithPhone,
      signInWithGoogle,
      updateProfile,
      refreshFromServer,
      signOut,
      isFieldLocked,
    }),
    [
      profile,
      sessionReady,
      signInWithPhone,
      signInWithGoogle,
      updateProfile,
      refreshFromServer,
      signOut,
      isFieldLocked,
    ],
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return ctx;
}
