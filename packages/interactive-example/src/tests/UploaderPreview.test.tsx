import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { UploaderPreview } from '../preview/UploaderPreview'

describe('UploaderPreview', () => {
    it('renders an UpupUploader in the preview frame', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 's3' } as any}>
                <UploaderPreview />
            </ConfigProvider>,
        )
        expect(
            document.querySelector('[data-upup-slot="uploader-panel"]'),
        ).toBeTruthy()
    })

    it('applies current config as props on UpupUploader', () => {
        render(
            <ConfigProvider initialConfig={{ mini: true } as any}>
                <UploaderPreview />
            </ConfigProvider>,
        )
        expect(
            document.querySelector('[data-upup-slot="uploader-panel"]'),
        ).toBeTruthy()
    })
})
