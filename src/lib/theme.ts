import { Theme } from 'types/theme'
import { create } from 'zustand'

export const theme: Theme = {
    container:
        '"relative flex h-[min(98svh,35rem)] w-full max-w-[min(98svh,46rem)] select-none flex-col overflow-hidden rounded-md border bg-[#f4f4f4] dark:bg-[#1f1f1f]"',
}

type ThemeStore = {
    theme: Theme
    setTheme: (newTheme: Theme) => void
}

export const useThemeStore = create(set => ({
    theme,
    setTheme: (newTheme: Theme) => set({ theme: { ...theme, ...newTheme } }),
})) as () => ThemeStore
