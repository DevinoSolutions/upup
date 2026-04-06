import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'

describe('useUpupUpload — accessibility and prop-getter states', () => {

    it('getDropzoneProps includes aria-dropeffect=none when not dragging', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        const props = result.current.getDropzoneProps()
        expect(props['aria-dropeffect']).toBe('none')
    })

    it('getDropzoneProps has tabIndex=0 for keyboard accessibility', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        const props = result.current.getDropzoneProps()
        expect(props.tabIndex).toBe(0)
    })

    it('getInputProps has tabIndex=-1 (hidden)', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        const props = result.current.getInputProps()
        expect(props.tabIndex).toBe(-1)
    })

    it('getInputProps has aria-hidden=true', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        expect(result.current.getInputProps()['aria-hidden']).toBe(true)
    })

    it('all three prop getters return stable objects', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        const root1 = result.current.getRootProps()
        const root2 = result.current.getRootProps()
        expect(root1.role).toBe(root2.role)
        expect(root1['aria-label']).toBe(root2['aria-label'])
    })
})
