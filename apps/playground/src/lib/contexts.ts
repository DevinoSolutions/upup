import { createContext } from "react";

export type ThemePreference = "light" | "dark" | "system";

export type DarkContextType = {
  isDarkMode: boolean;
  themePreference: ThemePreference;
  switchTheme: () => void;
};

export const ThemeContext = createContext<DarkContextType>({
  isDarkMode: false,
  themePreference: "system",
  switchTheme: () => {},
});
