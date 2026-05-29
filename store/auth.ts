import { create } from 'zustand';

export type UserRole = 'owner' | 'cast' | null;

interface AuthState {
  role: UserRole;
  userId: string | null;
  shopId: string | null;
  castId: string | null;
  name: string | null;
  shopName: string | null;
  email: string | undefined;
  loggedOut: boolean; // ログアウトトリガー
  setOwner: (data: { owner_id: string; shop_id: string; shop_name: string; email?: string }) => void;
  setCast: (data: { id: string; cast_id: string; cast_name: string; shop_id: string; email?: string }) => void;
  logout: () => void;
  clearLoggedOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  userId: null,
  shopId: null,
  castId: null,
  name: null,
  shopName: null,
  email: undefined,
  loggedOut: false,
  setOwner: ({ owner_id, shop_id, shop_name, email }) =>
    set({ role: 'owner', userId: owner_id, shopId: shop_id, shopName: shop_name, name: shop_name, email, loggedOut: false }),
  setCast: ({ id, cast_id, cast_name, shop_id, email }) =>
    set({ role: 'cast', userId: id, castId: cast_id, shopId: shop_id, name: cast_name, email, loggedOut: false }),
  logout: () =>
    set({ role: null, userId: null, shopId: null, castId: null, name: null, shopName: null, email: undefined, loggedOut: true }),
  clearLoggedOut: () => set({ loggedOut: false }),
}));
