---
'@useupup/core': patch
'@useupup/react': patch
'@useupup/vue': patch
'@useupup/svelte': patch
'@useupup/angular': patch
'@useupup/vanilla': patch
---

Declining an OAuth consent screen is reported as a cancellation, not as
"Popup was blocked by the browser".

Three things compounded. `DriveAuthFallback` auto-triggers sign-in on mount so
the tile click's transient user activation is still live — but OneDrive, Dropbox
and Box rendered it WITHOUT passing `error` (it stayed inside the
`...uploaderProps` rest), so its `|| error` guard could never fire. A decline
drove `isLoading` false, the view re-mounted with a fresh `attemptedRef`, and it
retried by itself. That second `window.open` had no activation left, returned
null, and `popup-oauth-plugin` reported the block — truthful about its own call,
misleading about the user, who was sent into their browser's popup settings over
a choice they had made themselves.

The decline was also never surfaced on its own: the popup poll accepted only
`href.startsWith(redirectUri) && href.includes('code=')`, so an
`?error=access_denied` redirect fell through until the window closed, and a
closed window resolved silently with no error and no state.

Now:

- Every drive component in every framework forwards `error` into its auth
  fallback, so the existing no-auto-retry-after-an-error guard is reachable
  across the remount (the guard itself stays React-only — no other framework's
  fallback auto-triggers on mount). The three popup providers had the same gap
  in React, Vue, Svelte, Angular and vanilla; vanilla gated the prop on Google
  Drive explicitly.
- The poll reads `error` / `error_description` off the redirect and reports a
  refused or admin-walled consent as a cancellation; a closed window is a
  cancellation too, rather than a silent resolve. `authenticateViaPopup()` still
  RESOLVES in both cases — the promise contract is unchanged, and the
  cancellation travels on the provider's existing error event.
- Cancellations carry `AUTH_DENIED` and a real popup block carries the new
  `AUTH_POPUP_BLOCKED` code, so the two can finally be told apart. The drive
  controller turns those into a `messageKey` on `DriveBrowserError`, and the
  renderer shows the matching catalogue string — the nine-locale `popupBlocked`
  that shipped unused, or a new `errors.authCancelled`. Every other failure keeps
  its own message, which carries detail a generic string would throw away.
- A popup attempt that ends without a session now clears `isLoading` and cannot
  become an unhandled rejection. A blocked popup threw before the state ever
  moved to `authenticating`, so the view sat on the spinner and the auth fallback
  carrying the error never rendered at all.

`UpupAuthError` takes an optional third `code` argument, defaulting to the
`AUTH_PROVIDER_ERROR` it always used, so existing call sites are unchanged.

`ErrorMessages.authCancelled` is OPTIONAL, so a hand-written locale bundle still
type-checks — that is why this is a patch and not a breaking minor. The uploader
wires en-US as the fallback bundle and would resolve the key anyway;
`driveErrorText` also carries the English wording for a translator built with no
fallback at all, so an omission renders English rather than the key.

The redirect poll reads the fragment as well as the query. The check it replaced
matched `code=` anywhere in the href, so narrowing to `searchParams` alone would
have left a spec-legal fragment-mode redirect unread until the window closed —
reported, wrongly again, as a cancellation.
