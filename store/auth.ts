import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'owner' | 'cast' | null;

interface AuthState {
  role: UserRole;
  userId: string | null;
  shopId: string | null;
  castId: string | null;
  name: string | null;
  shopName: string | null;
  shopSlug: string | null;
  email: string | undefined;
  loggedOut: boolean;
  setOwner: (data: { owner_id: string; shop_id: string; shop_name: string; shop_slug?: string; email?: string }) => void;
  setCast: (data: { id: string; cast_id: string; cast_name: string; shop_id: string; email?: string }) => void;
  logout: () => void;
  clearLoggedOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      userId: null,
      shopId: null,
      castId: null,
      name: null,
      shopName: null,
      shopSlug: null,
      email: undefined,
      loggedOut: false,
      setOwner: ({ owner_id, shop_id, shop_name, shop_slug, email }) =>
        set({ role: 'owner', userId: owner_id, shopId: shop_id, shopName: shop_name, shopSlug: shop_slug ?? null, name: shop_name, email, loggedOut: false }),
      setCast: ({ id, cast_id, cast_name, shop_id, email }) =>
        set({ role: 'cast', userId: id, castId: cast_id, shopId: shop_id, name: cast_name, email, loggedOut: false }),
      logout: () =>
        set({ role: null, userId: null, shopId: null, castId: null, name: null, shopName: null, shopSlug: null, email: undefined, loggedOut: true }),
      clearLoggedOut: () => set({ loggedOut: false }),
    }),
    {
      name: 'night-vision-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // loggedOutフラグは永続化しない（毎回起動時にfalse）
      partialize: (state) => ({
        role: state.role,
        userId: state.userId,
        shopId: state.shopId,
        castId: state.castId,
        name: state.name,
        shopName: state.shopName,
        shopSlug: state.shopSlug,
        email: state.email,
      }),
    }
  )
);
