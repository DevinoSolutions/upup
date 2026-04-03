'use client'

import React, { type ReactEventHandler } from 'react'
import { TbFile, TbFolder } from 'react-icons/tb'
import type { OneDriveFile, GoogleFile } from '../../lib/google-drive-utils'

function b64EncodeUnicode(str: string): string {
    return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
            String.fromCharCode(parseInt(p1, 16)),
        ),
    )
}

const handleImgError: ReactEventHandler<HTMLImageElement> = (e) => {
    const svg = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path></svg>`
    e.currentTarget.src = `data:image/svg+xml;base64,${b64EncodeUnicode(svg)}`
    e.currentTarget.onerror = null
}

export default function DriveBrowserIcon({
    file,
}: {
    file: OneDriveFile | GoogleFile
}) {
    const isFolder = Boolean(
        (file as OneDriveFile).isFolder || (file as GoogleFile).children,
    )
    const src =
        'isFolder' in file
            ? (file as OneDriveFile).thumbnails?.small?.url
            : (file as GoogleFile).thumbnailLink

    if (isFolder)
        return (
            <i className="upup-flex-grow upup-text-lg">
                <TbFolder style={{ color: 'var(--upup-color-text-muted)' }} />
            </i>
        )
    if (!src)
        return (
            <i className="upup-flex-grow upup-text-lg">
                <TbFile style={{ color: 'var(--upup-color-text-muted)' }} />
            </i>
        )

    return (
        <img
            src={src}
            alt={file.name}
            className="upup-h-5 upup-w-5 upup-flex-grow upup-rounded-md upup-shadow"
            onError={handleImgError}
        />
    )
}
