import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { ApiError, fetchCustomer, saveCustomer, type SavedCustomer } from '@/lib/api';
import { signOutGoogleAuth } from '@/lib/google-auth';
import { signOutPhoneAuth } from '@/lib/phone-auth';
import { formatPhoneInput, isValidIndianMobile, mobileDigitsFromStored } from '@/lib/phone';

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

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const syncCustomer = useCallback(async (next: UserProfile) => {
    const phone = mobileDigitsFromStored(next.phone);
    if (!isValidIndianMobile(phone)) return;

    const localName = next.name.trim();
    try {
      if (localName.length >= 2) {
        const saved = await saveCustomer({
          name: localName,
          phone,
          email: next.email.trim() || undefined,
          city: next.city.trim() || undefined,
        });
        setProfile((prev) => (prev ? mergeServerCustomer(prev, saved) : prev));
        return;
      }

      try {
        const existing = await fetchCustomer(phone);
        setProfile((prev) => (prev ? mergeServerCustomer(prev, existing) : prev));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          const saved = await saveCustomer({
            name: 'Customer',
            phone,
            email: next.email.trim() || undefined,
            city: next.city.trim() || undefined,
          });
          setProfile((prev) => (prev ? mergeServerCustomer(prev, saved) : prev));
        }
      }
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
      void syncCustomer(next);
    },
    [syncCustomer],
  );

  const signInWithGoogle = useCallback((account: { name: string; email: string }) => {
    setProfile({
      authMethod: 'google',
      name: account.name,
      email: account.email,
      phone: '',
      memberSince: '',
      city: '',
    });
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
        void syncCustomer(next);
        return next;
      });
    },
    [syncCustomer],
  );

  const refreshFromServer = useCallback(async () => {
    const phone = mobileDigitsFromStored(profile?.phone ?? '');
    if (!isValidIndianMobile(phone)) return;
    try {
      const customer = await fetchCustomer(phone);
      setProfile((prev) => {
        if (!prev) return prev;
        const serverName = customer.name.trim();
        const usableName = serverName && serverName.toLowerCase() !== 'customer' ? serverName : '';
        return {
          ...prev,
          name: usableName || prev.name,
          email: customer.email || prev.email,
          city: customer.city || prev.city,
          memberSince: customer.memberSince || prev.memberSince,
        };
      });
    } catch {
      // Keep the session already on the phone.
    }
  }, [profile?.phone]);

  const signOut = useCallback(() => {
    setProfile(null);
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
      signInWithPhone,
      signInWithGoogle,
      updateProfile,
      refreshFromServer,
      signOut,
      isFieldLocked,
    }),
    [profile, signInWithPhone, signInWithGoogle, updateProfile, refreshFromServer, signOut, isFieldLocked],
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
