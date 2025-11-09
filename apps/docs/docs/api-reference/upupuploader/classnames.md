---
sidebar_position: 2
---

# ClassNames

The `UpupUploader` component was designed using [Tailwind CSS v.3.3.5](https://v3.tailwindcss.com/), and is fully customisable using the `classNames` prop object. All keys of the `classNames` object props expect classname values as string: whether TailwindCSS classes or not.

:::note
It is important to note that:

- the full UpupUploader has a height of `480px` and will occupy the width of its container until a max-width of `600px`
- the [mini](/docs/api-reference/upupuploader/optional-props.md#mini) UpupUploader has a height of `3970px` and will occupy the width of its container until a max-width of `280px`

:::

## Categories

We've split the classnames into groups for easier understanding

### Adapter Button

These classNames style the buttons that let users select different upload methods (Google Drive, Camera, etc.).

| Key               | Example                                            | Type   | Status   | Default Value (Light Mode)                                                                                                                                             | Added Default Value (Dark Mode)          |
| ----------------- | -------------------------------------------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| adapterButton     | `classNames={{adapterButton: "my-classname"}}`     | string | optional | `group flex items-center gap-[6px] border-b border-gray-200 px-2 py-1 @cs/main:flex-col @cs/main:justify-center @cs/main:rounded-lg @cs/main:border-none @cs/main:p-0` | `border-[#6D6D6D] dark:border-[#6D6D6D]` |
| adapterButtonIcon | `classNames={{adapterButtonIcon: "my-classname"}}` | string | optional | `scale-75 rounded-lg bg-white p-0 text-2xl font-semibold group-hover:scale-90 @cs/main:scale-100 @cs/main:p-[6px] @cs/main:shadow @cs/main:group-hover:scale-110`      | `bg-[#323232] dark:bg-[#323232]`         |
| adapterButtonList | `classNames={{adapterButtonList: "my-classname"}}` | string | optional | `flex w-full flex-col justify-center gap-1 @cs/main:flex-row @cs/main:flex-wrap @cs/main:items-center @cs/main:gap-[30px] @cs/main:px-[30px]`                          | N/A                                      |
| adapterButtonText | `classNames={{adapterButtonText: "my-classname"}}` | string | optional | `text-xs text-[#242634]`                                                                                                                                               | `text-[#6D6D6D] dark:text-[#6D6D6D]`     |

### Adapter View

These classNames style the specific upload method interfaces (Google Drive, Camera, etc.) after selection.

| Key                     | Example                                                  | Type   | Status   | Default Value (Light Mode)                                                                                      | Added Default Value (Dark Mode)                                   |
| ----------------------- | -------------------------------------------------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| adapterView             | `classNames={{adapterView: "my-classname"}}`             | string | optional | `flex items-center justify-center overflow-hidden bg-black/[0.075]`                                             | `bg-white/10 text-[#FAFAFA] dark:bg-white/10 dark:text-[#FAFAFA]` |
| adapterViewCancelButton | `classNames={{adapterViewCancelButton: "my-classname"}}` | string | optional | `rounded-md p-1 text-blue-600 transition-all duration-300`                                                      | `text-[#30C5F7] dark:text-[#30C5F7]`                              |
| adapterViewHeader       | `classNames={{adapterViewHeader: "my-classname"}}`       | string | optional | `shadow-bottom flex items-center justify-between bg-black/[0.025] px-3 py-2 text-sm font-medium text-[#1b5dab]` | `bg-white/5 text-[#FAFAFA] dark:bg-white/5 dark:text-[#FAFAFA]`   |

### Camera Adapter

| Key                    | Example                                             | Type   | Status   | Default Value (Light Mode)                                                                                                  | Added Default Value (Dark Mode)  |
| ---------------------- | --------------------------------------------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| cameraAddButton        | `classNames={{cameraAddButton: "my-class"}}`        | string | optional | `mt-2 w-full rounded-md bg-blue-600 p-2 text-white transition-all duration-300`                                             | `bg-[#59D1F9] dark:bg-[#59D1F9]` |
| cameraCaptureButton    | `classNames={{cameraCaptureButton: "my-class"}}`    | string | optional | `mt-2 flex w-1/3 flex-col items-center  justify-center rounded-md  bg-blue-600 p-2 text-white transition-all duration-300`  | `bg-[#59D1F9] dark:bg-[#59D1F9]` |
| cameraDeleteButton     | `classNames={{cameraDeleteButton: "my-class"}}`     | string | optional | `absolute -right-2 -top-2 z-10 rounded-full bg-[#272727] p-1 text-xl text-[#f5f5f5]`                                        | N/A                              |
| cameraPreviewContainer | `classNames={{cameraPreviewContainer: "my-class"}}` | string | optional | `relative aspect-video bg-black/[0.025] bg-contain bg-center bg-no-repeat  shadow-xl`                                       | `bg-white/5 dark:bg-white/5`     |
| cameraRotateButton     | `classNames={{cameraRotateButton: "my-class"}}`     | string | optional | `mt-2 flex w-1/3 flex-col items-center rounded-md bg-gray-500 p-2 text-white transition-all duration-300 hover:bg-gray-600` | N/A                              |

### Container

These classNames are responsible for the general look and feel of the component container class.

| Key                    | Example                                                 | Type   | Status   | Default Value (Light Mode)                                                                                                                                                | Added Default Value (Dark Mode)      |
| ---------------------- | ------------------------------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| containerAddMoreButton | `classNames={{containerAddMoreButton: "my-classname"}}` | string | optional | `col-start-3 col-end-5 flex items-center justify-end gap-1 p-1 text-sm text-blue-600 @cs/main:col-start-4`                                                                | `text-[#30C5F7] dark:text-[#30C5F7]` |
| containerCancelButton  | `classNames={{containerCancelButton: "my-classname"}}`  | string | optional | `max-md col-start-1 col-end-3 row-start-2 p-1 text-left text-sm text-blue-600 @cs/main:col-end-2 @cs/main:row-start-1`                                                    | `text-[#30C5F7] dark:text-[#30C5F7]` |
| containerFull          | `classNames={{containerFull: "my-classname"}}`          | string | optional | `shadow-wrapper flex h-full w-full select-none flex-col gap-3 overflow-hidden rounded-2xl bg-white px-5 py-4`                                                             | `bg-[#232323] dark:bg-[#232323]`     |
| containerHeader        | `classNames={{containerHeader: "my-classname"}}`        | string | optional | `shadow-bottom absolute left-0 right-0 top-0 z-10 grid grid-cols-4 grid-rows-2 items-center justify-between rounded-t-lg bg-black/[0.025] px-3 py-2 @cs/main:grid-rows-1` | `bg-white/5 dark:bg-white/5`         |
| containerMini          | `classNames={{containerMini: "my-classname"}}`          | string | optional | `shadow-bottom absolute left-0 right-0 top-0 z-10 grid grid-cols-4 grid-rows-2 items-center justify-between rounded-t-lg bg-black/[0.025] px-3 py-2 @cs/main:grid-rows-1` | `bg-white/5 dark:bg-white/5`         |

### Drive

| Key                        | Example                                                 | Type   | Status   | Default Value (Light Mode)                                                                                   | Added Default Value (Dark Mode)                                   |
| -------------------------- | ------------------------------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| driveAddFilesButton        | `classNames={{driveAddFilesButton: "my-class"}}`        | string | optional | `rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-all duration-300`                | `bg-[#30C5F7] dark:bg-[#30C5F7]`                                  |
| driveBody                  | `classNames={{driveBody: "my-class"}}`                  | string | optional | `h-full overflow-y-scroll bg-black/[0.075] pt-2`                                                             | `bg-white/10 text-[#fafafa] dark:bg-white/10 dark:text-[#fafafa]` |
| driveCancelFilesButton     | `classNames={{driveCancelFilesButton: "my-class"}}`     | string | optional | `ml-auto rounded-md p-1 text-sm text-blue-600 transition-all duration-300`                                   | `text-[#30C5F7] dark:text-[#30C5F7]`                              |
| driveFooter                | `classNames={{driveFooter: "my-class"}}`                | string | optional | `flex origin-bottom items-center justify-start gap-4 bg-black/[0.025] px-3 py-2`                             | `bg-white/5 text-[#fafafa] dark:bg-white/5 dark:text-[#fafafa]`   |
| driveHeader                | `classNames={{driveHeader: "my-class"}}`                | string | optional | `shadow-bottom grid grid-cols-[1fr,auto] bg-black/[0.025] px-3 py-2 text-xs font-medium text-[#333]`         | `bg-white/5 text-[#FAFAFA] dark:bg-white/5 dark:text-[#FAFAFA]`   |
| driveItemContainerDefault  | `classNames={{driveItemContainerDefault: "my-class"}}`  | string | optional | `group mb-1 flex cursor-pointer items-center justify-between gap-2 rounded-md p-1 py-2 hover:bg-[#bab4b499]` | N/A                                                               |
| driveItemContainerInner    | `classNames={{driveItemContainerInner: "my-class"}}`    | string | optional | `flex items-center gap-2`                                                                                    | N/A                                                               |
| driveItemContainerSelected | `classNames={{driveItemContainerSelected: "my-class"}}` | string | optional | `bg-[#bab4b499]`                                                                                             | N/A                                                               |
| driveItemInnerText         | `classNames={{driveItemInnerText: "my-class"}}`         | string | optional | `text-wrap break-all text-xs`                                                                                | `text-[#e0e0e0] dark:text-[#e0e0e0]`                              |
| driveLoading               | `classNames={{driveLoading: "my-class"}}`               | string | optional | `flex items-center justify-center overflow-hidden bg-black/[0.075]`                                          | `bg-white/10 text-[#FAFAFA] dark:bg-white/10 dark:text-[#FAFAFA]` |
| driveLogoutButton          | `classNames={{driveLogoutButton: "my-class"}}`          | string | optional | `text-blue-600 hover:underline`                                                                              | `text-[#30C5F7] dark:text-[#30C5F7]`                              |
| driveSearchContainer       | `classNames={{driveSearchContainer: "my-class"}}`       | string | optional | `relative h-fit bg-black/[0.025] px-3 py-2`                                                                  | `bg-white/5 text-[#fafafa] dark:bg-white/5 dark:text-[#fafafa]`   |
| driveSearchInput           | `classNames={{driveSearchInput: "my-class"}}`           | string | optional | `h-fit w-full rounded-md bg-black/[0.025] px-3 py-2 pl-8 text-xs outline-none transition-all duration-300`   | `bg-white/5 text-[#6D6D6D] dark:bg-white/5 dark:text-[#6D6D6D]`   |

### File

| Key                            | Example                                                     | Type   | Status   | Default Value (Light Mode)                                                                                                                                                                                     | Added Default Value (Dark Mode)                                                       |
| ------------------------------ | ----------------------------------------------------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| fileDeleteButton               | `classNames={{fileDeleteButton: "my-class"}}`               | string | optional | `z-1 absolute -right-[10px] -top-[10px] scale-90 rounded-full @cs/main:scale-100`                                                                                                                              | N/A                                                                                   |
| fileInfo                       | `classNames={{fileInfo: "my-class"}}`                       | string | optional | `flex flex-col items-start justify-between p-2 pt-0 @cs/main:p-0`                                                                                                                                              | N/A                                                                                   |
| fileItemMultiple               | `classNames={{fileItemMultiple: "my-class"}}`               | string | optional | `relative flex flex-1 gap-2 rounded border border-[#6D6D6D] bg-white @cs/main:static @cs/main:basis-32 @cs/main:rounded-none @cs/main:border-none @cs/main:bg-transparent @cs/main:flex-col`                   | `bg-[#1F1F1F] @cs/main:bg-transparent dark:bg-[#1F1F1F] @cs/main:dark:bg-transparent` |
| fileItemSingle                 | `classNames={{fileItemSingle: "my-class"}}`                 | string | optional | `relative flex flex-1 gap-2 rounded border border-[#6D6D6D] bg-white @cs/main:static @cs/main:basis-32 @cs/main:rounded-none @cs/main:border-none @cs/main:bg-transparent flex-col`                            | `bg-[#1F1F1F] @cs/main:bg-transparent dark:bg-[#1F1F1F] @cs/main:dark:bg-transparent` |
| fileListContainer              | `classNames={{fileListContainer: "my-class"}}`              | string | optional | `preview-scroll flex flex-1 flex-col overflow-y-auto bg-black/[0.075] p-3`                                                                                                                                     | `bg-white/10 dark:bg-white/10`                                                        |
| fileListContainerInnerMultiple | `classNames={{fileListContainerInnerMultiple: "my-class"}}` | string | optional | `flex flex-col gap-4 @cs/main:grid @cs/main:gap-y-6 @cs/main:grid-cols-3`                                                                                                                                      | N/A                                                                                   |
| fileListContainerInnerSingle   | `classNames={{fileListContainerInnerSingle: "my-class"}}`   | string | optional | `flex flex-col gap-4 @cs/main:grid @cs/main:gap-y-6 flex-1`                                                                                                                                                    | N/A                                                                                   |
| fileListFooter                 | `classNames={{fileListFooter: "my-class"}}`                 | string | optional | `shadow-top flex items-center gap-3 rounded-b-lg bg-black/[0.025] px-3 py-2`                                                                                                                                   | `bg-white/5 dark:bg-white/5`                                                          |
| fileName                       | `classNames={{fileName: "my-class"}}`                       | string | optional | `flex-1 text-xs text-[#0B0B0B]`                                                                                                                                                                                | `text-white dark:text-white`                                                          |
| filePreviewButton              | `classNames={{filePreviewButton: "my-class"}}`              | string | optional | `text-xs text-blue-600`                                                                                                                                                                                        | `text-[#59D1F9] dark:text-[#59D1F9]`                                                  |
| filePreviewPortal              | `classNames={{filePreviewPortal: "my-class"}}`              | string | optional | `absolute inset-0 m-4 bg-white`                                                                                                                                                                                | `bg-[#232323] dark:bg-[#232323]`                                                      |
| fileSize                       | `classNames={{fileSize: "my-class"}}`                       | string | optional | `text-xs text-[#6D6D6D]`                                                                                                                                                                                       | N/A                                                                                   |
| fileThumbnailMultiple          | `classNames={{fileThumbnailMultiple: "my-class"}}`          | string | optional | `shadow-right flex cursor-pointer items-center justify-center rounded-l bg-white bg-contain bg-center bg-no-repeat @cs/main:relative @cs/main:rounded-r @cs/main:shadow-md aspect-square w-14 @cs/main:w-full` | `bg-[#232323] dark:bg-[#232323]`                                                      |
| fileThumbnailSingle            | `classNames={{fileThumbnailSingle: "my-class"}}`            | string | optional | `shadow-right flex cursor-pointer items-center justify-center rounded-l bg-white bg-contain bg-center bg-no-repeat @cs/main:relative @cs/main:rounded-r @cs/main:shadow-md flex-1`                             | `bg-[#232323] dark:bg-[#232323]`                                                      |

### Progress

| Key                  | Example                                           | Type   | Status   | Default Value (Light Mode)                    | Added Default Value (Dark Mode) |
| -------------------- | ------------------------------------------------- | ------ | -------- | --------------------------------------------- | ------------------------------- |
| progressBarContainer | `classNames={{progressBarContainer: "my-class"}}` | string | optional | `flex items-center gap-2`                     | N/A                             |
| progressBar          | `classNames={{progressBar: "my-class"}}`          | string | optional | `h-[6px] flex-1 overflow-hidden bg-[#F5F5F5]` | N/A                             |
| progressBarInner     | `classNames={{progressBarInner: "my-class"}}`     | string | optional | `h-full rounded-[4px] bg-[#8EA5E7]`           | N/A                             |
| progressBarText      | `classNames={{progressBarText: "my-class"}}`      | string | optional | `text-xs font-semibold`                       | N/A                             |

### Upload

| Key              | Example                                       | Type   | Status   | Default Value (Light Mode)                                                                       | Added Default Value (Dark Mode)  |
| ---------------- | --------------------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------ | -------------------------------- |
| uploadButton     | `classNames={{uploadButton: "my-class"}}`     | string | optional | `ml-auto rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse` | `bg-[#30C5F7] dark:bg-[#30C5F7]` |
| uploadDoneButton | `classNames={{uploadDoneButton: "my-class"}}` | string | optional | `ml-auto rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse` | `bg-[#30C5F7] dark:bg-[#30C5F7]` |

### URL Adapter

| Key            | Example                                     | Type   | Status   | Default Value (Light Mode)                                                                            | Added Default Value (Dark Mode)                                                   |
| -------------- | ------------------------------------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| urlInput       | `classNames={{urlInput: "my-class"}}`       | string | optional | `w-full rounded-md border-2 border-[#e0e0e0] bg-transparent px-3 py-2 outline-none`                   | `border-[#6D6D6D] text-[#6D6D6D] dark:border-[#6D6D6D] dark:text-[#6D6D6D]`       |
| urlFetchButton | `classNames={{urlFetchButton: "my-class"}}` | string | optional | `mt-2 w-full rounded-md bg-blue-600 p-2 text-white transition-all duration-300 disabled:bg-[#e0e0e0]` | `bg-[#59D1F9] disabled:bg-[#6D6D6D] dark:bg-[#59D1F9] dark:disabled:bg-[#6D6D6D]` |

## Responsive Styling

The UpupUploader component uses container queries for responsive layout adjustments. The `@cs/main` utility class applies styles when the container width is above `475px`. The following values for `containerFull` will translate to the following CSS style:

```tsx
import { UpupUploader, UpupProvider } from "upup-react-file-uploader";
import 'upup-react-file-uploader/styles'

export default function Uploader() {
  return (
    <UpupUploader
      classNames={{
        containerFull: "pt-0 @cs/main:pt-4",
      }}
      provider={UpupProvider.AWS} // assuming we are uploading to AWS
      tokenEndpoint="http://<path_to_your_server>/api/upload-token" // Path to your server route that calls our exported upload utilities
    />
  );
}
```

```css
.pt-0 {
  padding-top: 0px; /* 0 top padding when the component width < 475px */
}

@container main (min-width: 475px) {
  .\@cs\/main\:pt-4 {
    padding-top: 1rem; /* 1rem or 16px top padding when the component width >= 475px */
  }
}
```

:::note
This doesn't apply to the [mini](/docs/api-reference/upupuploader/optional-props.md#mini) UpupUploader as it's maximum width is `280px`
:::

## Tailwind Important Modifier

When using Tailwind in your application, some default styles of the UpupUploader component require `!important` override due to specificity. For example:

```tsx
<UpupUploader
  provider={UpupProvider.BackBlaze}
  tokenEndpoint="http://localhost:3000/api/upload"
  classNames={{
    adapterButton: "bg-white !scale-[200%]",
    containerHeader: "border !border-black",
    containerCancelButton: "!bg-red-800",
    containerAddMoreButton: "!bg-pink-300",
    adapterView: "!border-4 !border-red-300",
  }}
/>
```

:::warning

- Use `!` sparingly - only when normal classes don't override defaults
- Test overrides in both light/dark modes
- Combine with state variants when needed

:::

:::note
The File Preview Portal uses an extreme z-index value (`z-[2147483647]`) to:

1. Ensure it always appears above all other elements
2. Prevent interference from third-party libraries
3. Maintain visibility during complex upload scenarios

:::

These patterns ensure proper styling control while maintaining the component's responsive behaviour and dark mode compatibility.
