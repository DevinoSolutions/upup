import { defineComponent, h } from 'vue'
import Icon from './Icon'

export const MyDeviceIcon = defineComponent({ name: 'MyDeviceIcon', render: () => h(Icon, { name: 'my-device' }) })
export const BoxIcon = defineComponent({ name: 'BoxIcon', render: () => h(Icon, { name: 'box' }) })
export const DropboxIcon = defineComponent({ name: 'DropboxIcon', render: () => h(Icon, { name: 'dropbox' }) })
export const GoogleDriveIcon = defineComponent({ name: 'GoogleDriveIcon', render: () => h(Icon, { name: 'google-drive' }) })
export const OneDriveIcon = defineComponent({ name: 'OneDriveIcon', render: () => h(Icon, { name: 'one-drive' }) })
export const LinkIcon = defineComponent({ name: 'LinkIcon', render: () => h(Icon, { name: 'link' }) })
export const CameraIcon = defineComponent({ name: 'CameraIcon', render: () => h(Icon, { name: 'camera' }) })
export const AudioIcon = defineComponent({ name: 'AudioIcon', render: () => h(Icon, { name: 'audio' }) })
export const ScreenCaptureIcon = defineComponent({ name: 'ScreenCaptureIcon', render: () => h(Icon, { name: 'screen-capture' }) })
