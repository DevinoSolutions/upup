import type { Preview } from '@storybook/angular'
import { installUpupStorybookMocks } from '../../../storybook/upupNetworkMocks'

installUpupStorybookMocks()

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
