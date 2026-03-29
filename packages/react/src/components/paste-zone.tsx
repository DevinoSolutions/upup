'use client'

import { useCallback, type ReactNode } from 'react'

export interface PasteZoneProps {
  onPaste: (files: File[]) => void
  children: ReactNode
  className?: string
}

function generatePastedFileName(type: string): string {
  const ext = type.split('/')[1] || 'bin'
  return `pasted-image-${Date.now()}.${ext}`
}

export function PasteZone({ onPaste, children, className }: PasteZoneProps) {
  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      const files: File[] = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind !== 'file') continue

        const file = item.getAsFile()
        if (!file) continue

        // Generate a name for pasted images (screenshots)
        if (!file.name || file.name === '') {
          const named = new File([file], generatePastedFileName(file.type), {
            type: file.type,
            lastModified: Date.now(),
          })
          files.push(named)
        } else {
          files.push(file)
        }
      }

      if (files.length > 0) {
        onPaste(files)
      }
    },
    [onPaste],
  )

  return (
    <div onPaste={handlePaste} className={className}>
      {children}
    </div>
  )
}
