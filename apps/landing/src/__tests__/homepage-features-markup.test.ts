// @vitest-environment jsdom
// Regression pin for the HomepageFeatures split (T-5372): the static markup of
// the composed section and of each extracted piece must stay byte-identical to
// the fixtures captured from the pre-split single-file component. Fixtures
// were captured from the pre-split file; refresh them only for an intentional DOM change.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/gtag', () => ({ event: vi.fn() }))
vi.mock('@/components/HomepageFeatures/notify-signup', () => ({
    submitAndRecordProviderInterest: vi.fn(async () => true),
}))
vi.mock('@/components/FeatureShowcase', () => ({ default: () => null }))
vi.mock('next/link', () => ({
    default: ({
        children,
        href,
        className,
    }: {
        children: unknown
        href: string
        className?: string
    }) => createElement('a', { href, className }, children as never),
}))

import HomepageFeatures from '@/components/HomepageFeatures'
import EmailModal from '@/components/HomepageFeatures/EmailModal'
import PlannedStrip from '@/components/HomepageFeatures/PlannedStrip'
import SupportedWall from '@/components/HomepageFeatures/SupportedWall'
import {
    developerStorageProviders,
    userStorageProviders,
} from '@/components/HomepageFeatures/providers'

const FIXTURE_DIR = join(
    process.cwd(),
    'src/__tests__/fixtures/homepage-features/',
)

const noop = () => {}

const states: Record<string, () => string> = {
    'default-section': () =>
        renderToStaticMarkup(createElement(HomepageFeatures)),
    'modal-open-provider': () =>
        renderToStaticMarkup(
            createElement(EmailModal, {
                isOpen: true,
                onClose: noop,
                integrationName: 'Notion',
            }),
        ),
    'modal-open-custom': () =>
        renderToStaticMarkup(
            createElement(EmailModal, {
                isOpen: true,
                onClose: noop,
                integrationName: '',
                isCustom: true,
            }),
        ),
    'modal-closed': () =>
        renderToStaticMarkup(
            createElement(EmailModal, {
                isOpen: false,
                onClose: noop,
                integrationName: 'Notion',
            }),
        ),
    'wall-user-supported': () =>
        renderToStaticMarkup(
            createElement(SupportedWall, {
                providers: userStorageProviders.filter(
                    p => p.status !== 'planned',
                ),
            }),
        ),
    'wall-developer-supported': () =>
        renderToStaticMarkup(
            createElement(SupportedWall, {
                providers: developerStorageProviders.filter(
                    p => p.status !== 'planned',
                ),
            }),
        ),
    'strip-user-planned': () =>
        renderToStaticMarkup(
            createElement(PlannedStrip, {
                planned: userStorageProviders.filter(
                    p => p.status === 'planned',
                ),
                onProviderClick: noop,
                onCustomRequest: noop,
            }),
        ),
}

describe('HomepageFeatures static markup', () => {
    for (const [name, render] of Object.entries(states)) {
        it(`${name} matches the pre-split fixture`, () => {
            const html = render()
            const file = `${FIXTURE_DIR}${name}.html`
            expect(existsSync(file)).toBe(true)
            // autocrlf checkouts rewrite the fixture's line endings; the markup has none.
            expect(html).toBe(
                readFileSync(file, 'utf8').replaceAll('\r\n', '\n'),
            )
        })
    }
})
