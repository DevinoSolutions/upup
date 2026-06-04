import type { Preview } from 'storybook-solidjs-vite'
import { installUpupStorybookMocks } from '../../../storybook/upupNetworkMocks'
import '../../vanilla/src/styles.css'

installUpupStorybookMocks()

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
}

export default preview
