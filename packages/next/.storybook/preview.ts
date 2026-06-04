import type { Preview } from '@storybook/nextjs-vite'
import { installUpupStorybookMocks } from '../../../storybook/upupNetworkMocks'
import '../../react/src/tailwind.css'

installUpupStorybookMocks()

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
}

export default preview
