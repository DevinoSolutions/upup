// src/parameters.ts
export const sharedParameters = {
  layout: 'centered' as const,
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#ffffff' },
      { name: 'dark', value: '#0a0a0a' },
    ],
  },
  controls: {
    sort: 'requiredFirst' as const,
    expanded: true,
    matchers: { color: /(background|color)$/i, date: /Date$/i },
  },
  a11y: { test: 'todo' as const },
}
