import { installUpupStorybookMocks } from '../../../storybook/upupNetworkMocks'
import '../../vanilla/src/styles.css'

installUpupStorybookMocks()

const preview = {
  parameters: {
    layout: 'centered',
  },
}

export default preview
