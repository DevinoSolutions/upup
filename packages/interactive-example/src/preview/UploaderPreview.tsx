'use client'
import React, { useContext } from 'react'
import { UpupUploader } from '@upup/react'
import '@upup/react/styles'
import { ConfigContext } from '../state/ConfigContext'

export function UploaderPreview({ width = 'auto' }: { width?: number | 'auto' }) {
    const ctx = useContext(ConfigContext)
    if (!ctx) return null
    const style = width === 'auto' ? undefined : { width: `${width}px`, maxWidth: '100%' }
    return (
        <div className="upup-ie-preview" style={style}>
            <UpupUploader provider="s3" serverUrl="" {...(ctx.config as any)} />
        </div>
    )
}
