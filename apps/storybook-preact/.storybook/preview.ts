import type { Preview } from '@storybook/preact-vite'
import { withThemeByClassName } from '@storybook/addon-themes'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { sharedParameters, themeClassMap, defaultTheme, uploadHandlers } from '@upup/storybook-config'

import '@upup/preact/styles'
import '@upup/storybook-config/brand.css'
import '../src/tailwind.css'

initialize({ onUnhandledRequest: 'bypass' })

const preview: Preview = {
  parameters: { ...sharedParameters, msw: { handlers: uploadHandlers } },
  loaders: [mswLoader],
  decorators: [
    withThemeByClassName({ themes: themeClassMap, defaultTheme, parentSelector: 'html' }),
  ],
}
export default preview
