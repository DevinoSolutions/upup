import type {
  DragEventHandler,
  ClipboardEventHandler,
  ChangeEventHandler,
  HTMLAttributes,
  InputHTMLAttributes,
} from 'react'

export interface PropGetterDeps {
  addFiles: (files: File[]) => Promise<void> | void
  status: string
  accept: string | undefined
  multiple: boolean
  isDragging: boolean
  setIsDragging: (v: boolean) => void
  disableDragAction: boolean
}

function composeEventHandlers<E>(
  ...handlers: (((e: E) => void) | undefined)[]
): (e: E) => void {
  return (event: E) => {
    for (const handler of handlers) {
      handler?.(event)
    }
  }
}

export function createPropGetters(deps: PropGetterDeps) {
  const {
    addFiles,
    status,
    accept,
    multiple,
    isDragging,
    setIsDragging,
    disableDragAction,
  } = deps

  function getDropzoneProps(
    overrides: HTMLAttributes<HTMLElement> = {},
  ) {
    const onDragOver: DragEventHandler = (e) => {
      if (disableDragAction) return
      e.preventDefault()
      setIsDragging(true)
      e.dataTransfer.dropEffect = 'copy'
    }

    const onDragLeave: DragEventHandler = (e) => {
      if (disableDragAction) return
      e.preventDefault()
      setIsDragging(false)
    }

    const onDrop: DragEventHandler = async (e) => {
      if (disableDragAction) return
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      await addFiles(files)
      setIsDragging(false)
    }

    const onPaste: ClipboardEventHandler = (e) => {
      if (disableDragAction) return
      const items = Array.from(e.clipboardData?.items || [])
      const pastedFiles = items
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter((f): f is File => f !== null)
      if (!pastedFiles.length) return
      e.preventDefault()
      addFiles(pastedFiles)
    }

    return {
      onDragOver: composeEventHandlers(onDragOver, overrides.onDragOver as any),
      onDragLeave: composeEventHandlers(onDragLeave, overrides.onDragLeave as any),
      onDrop: composeEventHandlers(onDrop, overrides.onDrop as any),
      onPaste: composeEventHandlers(onPaste, overrides.onPaste as any),
      role: 'region' as const,
      'aria-label': 'Drop files here or click to browse',
      'aria-dropeffect': (isDragging ? 'copy' : 'none') as 'copy' | 'none',
      tabIndex: 0,
    }
  }

  function getRootProps(overrides: HTMLAttributes<HTMLElement> = {}) {
    const isUploading = status === 'uploading'
    return {
      ...overrides,
      role: 'application' as const,
      'aria-label': 'File uploader',
      'aria-busy': isUploading,
      'aria-describedby': undefined as string | undefined,
    }
  }

  function getInputProps(
    overrides: InputHTMLAttributes<HTMLInputElement> = {},
  ) {
    const onChange: ChangeEventHandler<HTMLInputElement> = (e) => {
      const fileList = e.target.files
      if (fileList) {
        addFiles(Array.from(fileList))
      }
    }
    return {
      ...overrides,
      type: 'file' as const,
      multiple,
      accept,
      onChange: composeEventHandlers(onChange, overrides.onChange as any),
      style: { display: 'none' as const },
      tabIndex: -1,
      'aria-hidden': true as const,
    }
  }

  return { getDropzoneProps, getRootProps, getInputProps }
}
