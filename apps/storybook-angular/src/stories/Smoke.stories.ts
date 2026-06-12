import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata } from '@storybook/angular'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import { applicationConfig } from '@storybook/angular'
import { UpupUploaderComponent } from '@upup/angular'
import type { UpupUploaderProps } from '@upup/angular'

// Minimal local-only config — no cloud drives, no server required.
// MSW intercepts the presign endpoint (wired via shared uploadHandlers in preview.ts).
const localConfig: UpupUploaderProps = {
  sources: ['local'],
  uploadEndpoint: '/api/upload',
  maxFiles: 3,
  showBranding: false,
  autoUpload: false,
}

const meta: Meta<UpupUploaderComponent> = {
  title: 'Angular/Smoke',
  component: UpupUploaderComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
    moduleMetadata({
      imports: [UpupUploaderComponent],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `<upup-uploader [config]="config" style="display:block;width:480px;height:420px"></upup-uploader>`,
  }),
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<UpupUploaderComponent>

/** Minimal smoke story — proves the Angular component mounts in Storybook. */
export const Smoke: Story = {
  args: {
    config: localConfig,
  },
}
