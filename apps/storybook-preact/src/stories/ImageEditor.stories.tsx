import type { Meta, StoryObj } from '@storybook/preact-vite'
import { UpupUploader } from '@upup/preact'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

// Fold virtual controls (themeMode, primaryColor) into the real `theme` prop,
// matching the other preact stories.
function render(args: Record<string, unknown>) {
  const { themeMode, primaryColor, ...rest } = args
  const theme = {
    ...(themeMode ? { mode: themeMode } : {}),
    ...(primaryColor ? { tokens: { color: { primary: primaryColor } } } : {}),
  }
  const props = { ...rest, ...(Object.keys(theme).length ? { theme } : {}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <UpupUploader {...(props as any)} />
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta: Meta<any> = {
  title: 'Preact/Image Editor',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: UpupUploader as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  argTypes: uploaderArgTypes as any,
  args: { ...uploaderDefaultArgs, sources: ['local'], allowedFileTypes: 'images' },
  render,
  parameters: { layout: 'padded' },
}
export default meta
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>

// Mirror the React story.
export const Enabled: Story = { args: { imageEditor: true } }
export const Disabled: Story = { args: { imageEditor: false } }

// display + autoOpen variants for live verification.
export const Modal: Story = {
  args: { imageEditor: { enabled: true, display: 'modal', autoOpen: 'always' } },
}
export const Inline: Story = {
  args: { imageEditor: { enabled: true, display: 'inline', autoOpen: 'always' } },
}
export const EnabledDark: Story = {
  args: { imageEditor: { enabled: true, display: 'modal', autoOpen: 'always' }, themeMode: 'dark' },
}
