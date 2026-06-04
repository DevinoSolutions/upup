import type { Preview } from '@storybook/vue3-vite'
import { installUpupStorybookMocks } from '../../../storybook/upupNetworkMocks'
import '../src/tailwind.css'

installUpupStorybookMocks()

const preview: Preview = {
    parameters: {
        layout: 'centered',
    },
}

export default preview
