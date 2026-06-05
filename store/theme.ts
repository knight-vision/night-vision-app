import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeId = 'default' | 'starry' | 'neon';

interface ThemeState {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: 'neon',
      setTheme: (themeId) => set({ themeId }),
    }),
    {
      name: 'night-vision-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
