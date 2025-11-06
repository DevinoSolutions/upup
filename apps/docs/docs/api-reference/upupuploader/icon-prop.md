---
sidebar_position: 4
---

# Icon Prop

The icon prop is an object used to configure what icons are shown on the UpupUploader client component. It is optional.

Each icon element must be a valid React element that accepts an optional `className` prop for styling.

:::info
Recommended icon library suites include:

- [React Icons](https://react-icons.github.io/react-icons)
- [Lucide Icons](https://lucide.dev/)

:::

| Key | Example | Type | Status | Default Value |
| ---  | ------- | ---- | ------ | ------------- |
| [CameraCaptureIcon](#cameracaptureicon) | `icons={{CameraCaptureIcon: FaCamera}}` | `FC<{ className?: string }>` | optional | `TbCapture` |
| [CameraDeleteIcon](#cameradeleteicon) | `icons={{CameraDeleteIcon: MdDelete}}` | `FC<{ className?: string }>` | optional | `TbTrash` |
| [CameraRotateIcon](#camerarotateicon) | `icons={{CameraRotateIcon: FaCameraRotate}}` | `FC<{ className?: string }>` | optional | `TbCameraRotate` |
| [ContainerAddMoreIcon](#containeraddmoreicon) | `icons={{ContainerAddMoreIcon: IoAdd}}` | `FC<{ className?: string }>` | optional | `TbPlus` |
| [FileDeleteIcon](#filedeleteicon) | `icons={{FileDeleteIcon: TiDelete}}` | `FC<{ className?: string }>` | optional | `TbTrash` |
| [LoaderIcon](#loadericon) | `icons={{LoaderIcon: TbLoader2}}` | `FC<{ className?: string }>` | optional | `TbLoader` |

## `CameraCaptureIcon`

Custom icon for the camera capture button.

**Example override:**

```javascript
import { FaCamera } from 'react-icons/fa'

<UpupUploader
  icons={{
    CameraCaptureIcon: FaCamera
  }}
/>
```

## `CameraDeleteIcon`

Icon for removing captured camera images.

## `CameraRotateIcon`

Button to switch between front/back camera.

## `ContainerAddMoreIcon`

Icon shown in the "Add More Files" button. Appears when multiple uploads are allowed.

## `FileDeleteIcon`

Icon for removing selected files from the list.

## `LoaderIcon`

Animated icon shown during file processing.

**Customization example:**

```javascript
import { ImSpinner8 } from 'react-icons/im'

<UpupUploader
  icons={{
    LoaderIcon: ImSpinner8
  }}
/>
```

All icons inherit the component's dark mode styling automatically through the `className` prop when provided.
