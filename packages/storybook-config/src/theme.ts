// src/theme.ts
import { create } from 'storybook/theming'

// Tokens lifted from the playground (apps/playground/tailwind.config.ts,
// apps/playground/src/app/globals.css). 'storybook/theming' is the v9 path;
// on Storybook <9 it is '@storybook/theming'.
export const upupManagerTheme = create({
  base: 'light',
  brandTitle: 'Upup',
  brandUrl: 'https://github.com/DevinoSolutions/upup',
  colorPrimary: '#1849d6',
  colorSecondary: '#37c4f5',
  appBg: '#ffffff',
  appContentBg: '#ffffff',
  barSelectedColor: '#1849d6',
  fontBase: '"Geist", Arial, Helvetica, sans-serif',
  fontCode: '"Geist Mono", ui-monospace, monospace',
})
