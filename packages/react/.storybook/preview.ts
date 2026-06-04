import type { Preview } from '@storybook/react-vite'
import { installUpupStorybookMocks } from '../../../storybook/upupNetworkMocks'
import '../src/tailwind.css'

installUpupStorybookMocks()

const preview: Preview = {
    parameters: {
        layout: 'centered',
    },
}

export default preview
