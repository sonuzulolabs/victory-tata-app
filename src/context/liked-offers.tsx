import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { useUserProfile } from '@/context/user-profile';
import { likeOffer, unlikeOffer } from '@/lib/api';
import { isValidIndianMobile, mobileDigitsFromStored } from '@/lib/phone';

type LikedOffersContextValue = {
  likedIds: Set<string>;
  isLiked: (id: string) => boolean;
  toggleLiked: (id: string) => void;
  setLiked: (id: string, value: boolean) => void;
};

const LikedOffersContext = createContext<LikedOffersContextValue | null>(null);

export function LikedOffersProvider({ children }: { children: ReactNode }) {
  const { profile } = useUserProfile();
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());

  const isLiked = useCallback((id: string) => likedIds.has(id), [likedIds]);

  const setLiked = useCallback((id: string, value: boolean) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleLiked = useCallback(
    (id: string) => {
      const phone = mobileDigitsFromStored(profile?.phone ?? '');
      const currentlyLiked = likedIds.has(id);
      setLiked(id, !currentlyLiked);

      if (!isValidIndianMobile(phone)) return;

      const request = currentlyLiked ? unlikeOffer(id, phone) : likeOffer(id, phone);
      void request.catch(() => {
        setLiked(id, currentlyLiked);
      });
    },
    [likedIds, profile?.phone, setLiked],
  );

  const value = useMemo(
    () => ({ likedIds, isLiked, toggleLiked, setLiked }),
    [likedIds, isLiked, toggleLiked, setLiked],
  );

  return <LikedOffersContext.Provider value={value}>{children}</LikedOffersContext.Provider>;
}

export function useLikedOffers() {
  const ctx = useContext(LikedOffersContext);
  if (!ctx) {
    throw new Error('useLikedOffers must be used within LikedOffersProvider');
  }
  return ctx;
}
