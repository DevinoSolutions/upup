import type { Preview } from '@storybook/web-components-vite'
import { installUpupStorybookMocks } from '../../../storybook/upupNetworkMocks'
import '../src/styles.css'

installUpupStorybookMocks()

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
}

export default preview

