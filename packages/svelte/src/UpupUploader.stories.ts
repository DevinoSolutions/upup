import type { Meta, StoryObj } from '@storybook/svelte-vite'
import UpupUploaderDemo from './UpupUploaderDemo.svelte'

const meta: Meta<typeof UpupUploaderDemo> = {
  title: 'Svelte/UpupUploader',
  component: UpupUploaderDemo,
}

export default meta

type Story = StoryObj<typeof UpupUploaderDemo>

export const Basic: Story = {}

export const Dark: Story = {
  args: {
    theme: 'dark',
  },
}
