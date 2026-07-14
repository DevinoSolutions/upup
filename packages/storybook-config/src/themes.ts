// src/themes.ts
// Passed to withThemeByClassName in each app's preview. Empty string = no
// class (light); 'dark' adds the .dark class the uploader CSS keys off, matching
// the playground's darkMode: 'class'.
export const themeClassMap = {
  light: '',
  dark: 'dark',
} as const

export const defaultTheme = 'light' as const
