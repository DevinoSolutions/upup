import { expect, test, type Page, type Request } from '@playwright/test'

// Proves the four cloud-drive sign-ins on the DEPLOYED site start correctly,
// stopping at the provider's sign-in page — never signing in, never reaching
// consent. Nothing is mocked: the popup opens the real provider, and the
// assertions read the real authorize request and the page it renders.
//
// Why this exists: on 2026-10-02 the homepage demo's Dropbox and Box sign-ins
// both failed with "Invalid redirect_uri" / "redirect_uri_mismatch", and
// OneDrive would have failed right after sign-in — the popup redirect paths
// (/dp_redirect, /box_redirect, /od_redirect) had never been registered in the
// providers' consoles for useupup.com. That configuration lives outside this
// repo, so only a check against the live site can catch it drifting again.
//
// What it can and cannot prove:
// - Google, Dropbox and Box validate redirect_uri / origin BEFORE sign-in, so
//   an error-free sign-in page proves the registration.
// - Microsoft (login.microsoftonline.com/common) defers the redirect_uri check
//   until AFTER sign-in. For OneDrive this spec proves the authorize request
//   carries the right redirect_uri and the sign-in page renders; whether that
//   URI is registered (as a "Single-page application" redirect, required for
//   browser PKCE) still needs a signed-in human run.

const BASE = (process.env.UPUP_LIVE_BASE_URL || 'https://useupup.com').replace(
    /\/+$/,
    '',
)

// The provider error pages a misregistered app shows (each checked against a
// deliberately unregistered redirect_uri on 2026-10-02). Google: "Access
// blocked: This app's request is invalid" (redirect_uri_mismatch /
// origin_mismatch); Dropbox: "Error connecting app" / "Invalid redirect_uri";
// Box: "Application Error … redirect_uri_mismatch"; Microsoft: AADSTS*.
const PROVIDER_ERROR =
    /access blocked|invalid redirect_uri|redirect_uri_mismatch|origin_mismatch|invalid_client|error connecting app|application error|AADSTS\d+/i

type Drive = {
    /** `FileSource` id, as used by the demo's source buttons. */
    id: 'googleDrive' | 'oneDrive' | 'dropbox' | 'box'
    /** Server-mode route slug (`/api/upup/auth/<slug>/`). */
    slug: 'google-drive' | 'one-drive' | 'dropbox' | 'box'
    /** The provider's authorize endpoint the popup must request first. */
    authorize: RegExp
    /** Hosts the popup may legitimately end up on (sign-in pages). */
    hosts: RegExp
    /** The popup's redirect path on our origin; Google's GIS popup has none. */
    redirectPath: string | null
    /**
     * Text only the provider's anonymous sign-in page shows. Required because
     * Box renders client-side: its body is empty at domcontentloaded, so a
     * check for the ABSENCE of an error would pass before anything rendered.
     */
    signInPage: RegExp
}

const DRIVES: Drive[] = [
    {
        id: 'googleDrive',
        slug: 'google-drive',
        authorize: /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/,
        hosts: /(^|\.)accounts\.google\.com$/,
        redirectPath: null,
        signInPage: /Email or phone/i,
    },
    {
        id: 'oneDrive',
        slug: 'one-drive',
        authorize:
            /^https:\/\/login\.microsoftonline\.com\/common\/oauth2\/v2\.0\/authorize\?/,
        hosts: /(^|\.)(microsoftonline\.com|live\.com|microsoft\.com)$/,
        redirectPath: '/od_redirect',
        signInPage: /Can.t access your account|Sign-in options/i,
    },
    {
        id: 'dropbox',
        slug: 'dropbox',
        authorize: /^https:\/\/www\.dropbox\.com\/oauth2\/authorize\?/,
        hosts: /(^|\.)dropbox\.com$/,
        redirectPath: '/dp_redirect',
        signInPage: /Log in or sign up to Dropbox/i,
    },
    {
        id: 'box',
        slug: 'box',
        authorize: /^https:\/\/account\.box\.com\/api\/oauth2\/authorize\?/,
        hosts: /(^|\.)box\.com$/,
        redirectPath: '/box_redirect',
        signInPage: /Log in to grant access to Box/i,
    },
]

/**
 * Wait until the provider has rendered either its sign-in page or an error
 * page, then require the sign-in page and no error.
 */
async function expectSignInPage(page: Page, drive: Drive): Promise<void> {
    const body = page.locator('body')
    await expect(body).toContainText(
        new RegExp(`${drive.signInPage.source}|${PROVIDER_ERROR.source}`, 'i'),
    )
    const text = (await body.innerText()).replace(/\s+/g, ' ')
    expect(text).not.toMatch(PROVIDER_ERROR)
    expect(text).toMatch(drive.signInPage)
}

/**
 * Click the drive in the homepage demo and return the sign-in popup. Some
 * drives open the popup straight from the source button; others first show a
 * "Sign in" button in the drive view — whichever appears first wins.
 */
async function openSignInPopup(page: Page, drive: Drive): Promise<Page> {
    await page.goto('/')
    const demo = page.locator('#demo')
    // The demo mounts on approach (DeferredInteractiveExample).
    await demo.scrollIntoViewIfNeeded()
    const source = demo.locator(`[data-testid="upup-source-${drive.id}"]`)
    await expect(source).toBeVisible()

    const popupPromise = page.context().waitForEvent('page')
    await source.click()
    const signIn = demo.getByRole('button', { name: /sign in/i }).first()
    const viaButton = signIn
        .waitFor({ state: 'visible' })
        .then(() => signIn.click())
        .then(() => popupPromise)
    // Whichever route did not win must not surface as an unhandled rejection
    // once the page closes.
    viaButton.catch(() => undefined)
    return Promise.race([popupPromise, viaButton])
}

test.describe('live drive sign-in (homepage demo, client mode)', () => {
    for (const drive of DRIVES) {
        test(`${drive.id} popup requests the provider with this origin's redirect and shows its sign-in page error-free`, async ({
            page,
        }) => {
            const requests: Request[] = []
            page.context().on('request', request => requests.push(request))

            const popup = await openSignInPopup(page, drive)
            await expect
                .poll(() => requests.some(r => drive.authorize.test(r.url())))
                .toBe(true)
            const authorizeUrl = new URL(
                requests.find(r => drive.authorize.test(r.url()))!.url(),
            )

            if (drive.redirectPath) {
                expect(authorizeUrl.searchParams.get('redirect_uri')).toBe(
                    `${BASE}${drive.redirectPath}`,
                )
            } else {
                // Google Identity Services: the popup is bound to the page's
                // origin rather than a redirect path on it.
                expect(authorizeUrl.searchParams.get('origin')).toBe(BASE)
            }
            expect(authorizeUrl.searchParams.get('client_id')).toBeTruthy()

            await expect
                .poll(() => new URL(popup.url()).hostname)
                .toMatch(drive.hosts)
            await expectSignInPage(popup, drive)
            await popup.close()
        })
    }
})

test.describe('live drive sign-in (server mode start routes)', () => {
    for (const drive of DRIVES) {
        test(`${drive.slug} start route redirects to the provider with its /cb redirect and the provider accepts it`, async ({
            page,
            request,
        }) => {
            const start = await request.get(`/api/upup/auth/${drive.slug}/`, {
                maxRedirects: 0,
            })
            expect(start.status()).toBe(302)
            const location = new URL(start.headers()['location'])
            expect(location.href).toMatch(drive.authorize)
            expect(location.searchParams.get('redirect_uri')).toBe(
                `${BASE}/api/upup/auth/${drive.slug}/cb`,
            )

            await page.goto(location.href)
            await expect
                .poll(() => new URL(page.url()).hostname)
                .toMatch(drive.hosts)
            await expectSignInPage(page, drive)
        })
    }
})

// Keeps PROVIDER_ERROR honest: if a provider rewords its mismatch page, the
// checks above would pass on a broken registration. Same real authorize URL
// as the start route, with only redirect_uri swapped for one that is never
// registered. Microsoft is left out: it only validates after sign-in.
test.describe('live drive sign-in (error detector self-check)', () => {
    for (const drive of DRIVES.filter(d => d.id !== 'oneDrive')) {
        test(`${drive.slug} shows a page the detector flags for an unregistered redirect_uri`, async ({
            page,
            request,
        }) => {
            const start = await request.get(`/api/upup/auth/${drive.slug}/`, {
                maxRedirects: 0,
            })
            const location = new URL(start.headers()['location'])
            location.searchParams.set(
                'redirect_uri',
                `${BASE}/__upup_unregistered_redirect__`,
            )

            await page.goto(location.href)
            await expect(page.locator('body')).toContainText(PROVIDER_ERROR)
        })
    }
})
