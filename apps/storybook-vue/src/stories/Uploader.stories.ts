import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader } from '@upup/vue'
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
  title: 'Vue/Uploader',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: uploaderDefaultArgs,
  render: (args) => ({
    components: { UpupUploader },
    setup() {
      return { props: buildProps(args as Record<string, unknown>) }
    },
    template: '<UpupUploader v-bind="props" />',
  }),
  parameters: { layout: 'padded' },
}
export default meta

type Story = StoryObj<typeof UpupUploader>

export const Playground: Story = {}

export const Basic: Story = {
  args: { sources: ['local'], showBranding: false, maxFiles: 1 },
}
