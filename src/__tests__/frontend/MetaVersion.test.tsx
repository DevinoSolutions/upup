import { render, screen } from '@testing-library/react'
import * as React from 'react'
import MetaVersion from '../../frontend/components/MetaVersion'
import { LIB_VERSION } from '../../version'

describe('MetaVersion', () => {
    it('renders basic version info', () => {
        render(<MetaVersion maxFileSize={{ size: 10, unit: 'MB' }} limit={5} />)

        // Check version number
        expect(screen.getByText(`Upup v${LIB_VERSION}`)).toBeInTheDocument()

        // Check file size limit info
        expect(screen.getByText(/up to 10MB/i)).toBeInTheDocument()

        // Check file count limit
        expect(screen.getByText(/Max 5 files/i)).toBeInTheDocument()

        // Check powered by text
        expect(screen.getByText(/Powered by uNotes/i)).toBeInTheDocument()
    })

    it('renders custom message when provided', () => {
        const customMessage = 'Test custom message'
        render(
            <MetaVersion
                maxFileSize={{ size: 10, unit: 'MB' }}
                limit={5}
                customMessage={customMessage}
            />,
        )

        expect(screen.getByText(new RegExp(customMessage))).toBeInTheDocument()
    })

    it('handles undefined limit correctly', () => {
        render(
            <MetaVersion
                limit={undefined}
                maxFileSize={{ size: 10, unit: 'MB' }}
            />,
        )

        // Should not show max files text
        expect(screen.queryByText(/Max.*files/i)).not.toBeInTheDocument()
    })

    it('handles different file size units', () => {
        const units = ['KB', 'MB', 'GB', 'TB'] as const
        units.forEach(unit => {
            const { unmount } = render(
                <MetaVersion
                    limit={undefined}
                    maxFileSize={{ size: 10, unit }}
                />,
            )
            expect(screen.getByText(`up to 10${unit}.`)).toBeInTheDocument()
            unmount()
        })
    })

    it('combines all optional properties correctly', () => {
        render(
            <MetaVersion
                maxFileSize={{ size: 10, unit: 'MB' }}
                limit={5}
                customMessage="Custom test"
            />,
        )

        const text = screen.getByText(/Custom test, Max 5 files, up to 10MB./i)
        expect(text).toBeInTheDocument()
    })

    it('handles edge case file sizes', () => {
        render(
            <MetaVersion
                limit={undefined}
                maxFileSize={{ size: 0.5, unit: 'MB' }}
            />,
        )
        expect(screen.getByText(/up to 0.5MB/i)).toBeInTheDocument()
    })
})
