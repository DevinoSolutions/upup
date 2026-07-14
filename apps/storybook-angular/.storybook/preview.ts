import type { Preview } from '@storybook/angular'
import { withThemeByClassName } from '@storybook/addon-themes'
import { initialize, mswLoader } from 'msw-storybook-addon'
import {
    sharedParameters,
    themeClassMap,
    defaultTheme,
    uploadHandlers,
} from '@upupjs/storybook-config'

// CSS is loaded via angular.json styles[] (webpack pipeline):
//   1. ../../packages/angular/dist/tailwind-prefixed.css  → @upupjs/angular component styles
//   2. ../../packages/storybook-config/src/brand.css      → shared brand tokens
//   3. src/tailwind.css                                   → story wrapper utilities
// No CSS imports needed here.

initialize({ onUnhandledRequest: 'bypass' })

const preview: Preview = {
    parameters: { ...sharedParameters, msw: { handlers: uploadHandlers } },
    loaders: [mswLoader],
    decorators: [
        withThemeByClassName({
            themes: themeClassMap,
            defaultTheme,
            parentSelector: 'html',
        }),
    ],
}

export default preview
