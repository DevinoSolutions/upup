"use client";

import { ThemeContext, type ThemePreference } from "@/lib/contexts";
import { ReactNode, useEffect, useState } from "react";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function readThemePreference(): ThemePreference {
  const saved = localStorage.getItem("theme");
  return isThemePreference(saved) ? saved : "system";
}

function resolveDarkMode(preference: ThemePreference): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(preference: ThemePreference): boolean {
  const isDark = resolveDarkMode(preference);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(isDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", preference);
  document.documentElement.setAttribute("data-theme-ready", "true");
  return isDark;
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setDarkMode] = useState(false);
  const [themePreference, setThemePreference] =
    useState<ThemePreference>("system");
  const [mounted, setMounted] = useState(false);

  const switchTheme = () => {
    const nextPreference: ThemePreference = isDarkMode ? "light" : "dark";
    localStorage.setItem("theme", nextPreference);
    setThemePreference(nextPreference);
    setDarkMode(applyTheme(nextPreference));
  };

  useEffect(() => {
    const preference = readThemePreference();
    setThemePreference(preference);
    setDarkMode(applyTheme(preference));
    setMounted(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      const current = readThemePreference();
      setThemePreference(current);
      setDarkMode(applyTheme(current));
    };
    media.addEventListener("change", onSystemThemeChange);
    return () => {
      media.removeEventListener("change", onSystemThemeChange);
    };
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider
      value={{ isDarkMode, themePreference, switchTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
