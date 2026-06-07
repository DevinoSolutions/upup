import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { UpupUploader } from '@upup/svelte'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

function buildProps(args: Record<string, unknown>) {
  const { themeMode, primaryColor, ...rest } = args
  const theme = {
    ...(themeMode ? { mode: themeMode } : {}),
    ...(primaryColor ? { tokens: { color: { primary: primaryColor } } } : {}),
  }
  return { ...rest, ...(Object.keys(theme).length ? { theme } : {}) }
}

const meta: Meta<typeof UpupUploader> = {
  title: 'Svelte/Uploader',
  component: UpupUploader as unknown as Meta<typeof UpupUploader>['component'],
  argTypes: uploaderArgTypes,
  args: uploaderDefaultArgs,
  render: (args) => ({
    Component: UpupUploader,
    props: buildProps(args as Record<string, unknown>),
  }),
  parameters: { layout: 'padded' },
}
export default meta

type Story = StoryObj<typeof UpupUploader>

export const Playground: Story = {}

export const Basic: Story = {
  args: { sources: ['local'], showBranding: false, maxFiles: 1 },
}

export const Smoke: Story = {
  play: async ({ canvasElement }) => {
    if (!canvasElement.querySelector('.upup-scope')) {
      throw new Error('Smoke: uploader (.upup-scope) did not mount')
    }
  },
}
