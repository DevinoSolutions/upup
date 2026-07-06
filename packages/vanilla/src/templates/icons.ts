import type { TemplateResult } from 'lit-html'
import { icon } from './icon'

export const MyDeviceIcon = (opts?: { size?: number; class?: string }): TemplateResult =>
    icon('my-device', opts)
export const GoogleDriveIcon = (opts?: { size?: number; class?: string }): TemplateResult =>
    icon('google-drive', opts)
export const OneDriveIcon = (opts?: { size?: number; class?: string }): TemplateResult =>
    icon('one-drive', opts)
export const DropboxIcon = (opts?: { size?: number; class?: string }): TemplateResult =>
    icon('dropbox', opts)
export const BoxIcon = (opts?: { size?: number; class?: string }): TemplateResult =>
    icon('box', opts)
export const LinkIcon = (opts?: { size?: number; class?: string }): TemplateResult =>
    icon('link', opts)
export const CameraIcon = (opts?: { size?: number; class?: string }): TemplateResult =>
    icon('camera', opts)
export const AudioIcon = (opts?: { size?: number; class?: string }): TemplateResult =>
    icon('audio', opts)
export const ScreenCaptureIcon = (opts?: { size?: number; class?: string }): TemplateResult =>
    icon('screen-capture', opts)
