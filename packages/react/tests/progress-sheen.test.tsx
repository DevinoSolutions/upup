import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import React from 'react'
import { UploadStatus } from '@upupjs/core'

afterEach(cleanup)

let uploadStatus: UploadStatus = UploadStatus.UPLOADING

vi.mock('../src/context/UploaderContext', () => ({
    useUploaderTheme: () => ({
        isDark: false,
        slotOverrides: {},
        slots: undefined,
    }),
    useUploaderI18n: () => ({
        translations: { uploadProgress: 'Upload progress' },
    }),
    useUploaderUploadControls: () => ({ upload: { uploadStatus } }),
    useUploaderOptions: () => ({ icons: { LoaderIcon: () => null } }),
    UploadStatus,
}))

import ProgressBar from '../src/components/shared/ProgressBar'

describe('ProgressBar uploading sheen + essential fill', () => {
    it('renders the moving sheen while an upload is active', () => {
        uploadStatus = UploadStatus.UPLOADING
        const { container } = render(<ProgressBar progress={40} />)
        expect(container.querySelector('.upup-animate-fx-sheen')).not.toBeNull()
        // the fill carries the essential width tween (survives motion-off)
        expect(
            container.querySelector('.upup-fx-progress-fill.upup-fx-essential'),
        ).not.toBeNull()
    })

    it('does not render the sheen when no upload is active', () => {
        uploadStatus = UploadStatus.SUCCESSFUL
        const { container } = render(<ProgressBar progress={100} />)
        expect(container.querySelector('.upup-animate-fx-sheen')).toBeNull()
    })
})
