import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LanguageCode, ThemePreference } from "@/types";
interface Preferences {
  language: LanguageCode;
  theme: ThemePreference;
  setLanguage: (language: LanguageCode) => void;
  setTheme: (theme: ThemePreference) => void;
}
export const useDashboardStore = create<Preferences>()(
  persist(
    (set) => ({
      language: "en-GB",
      theme: "dark",
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "imo-preferences",
      partialize: ({ language, theme }) => ({ language, theme }),
    },
  ),
);
