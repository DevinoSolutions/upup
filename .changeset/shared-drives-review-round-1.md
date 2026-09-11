---
'@useupup/core': patch
'@useupup/server': patch
---

Hardens the Google Drive `sharedDrives` option that shipped in 3.3.1.

A `drives.list` failure no longer takes the root listing down with it. The call
was awaited unguarded inside `loadFiles`, and `apiRequest` throws on any non-2xx,
so a 403 under a Workspace sharing policy, a 429 or a transient 5xx replaced the
person's My Drive files — which had listed fine a moment earlier — with an error
panel. It is now caught per page, keeps any drives collected before a
mid-pagination failure, and reports on a new NON-FATAL
`google-drive:shared-drives-error` event rather than the panel's `error`, which
`onFilesLoaded` would clear on the very next successful listing anyway.

Drive folder ids are escaped into the `files.list` query instead of interpolated
raw. `escapeDriveQueryValue` moved from `@useupup/server` into
`@useupup/core/internal`, and `@useupup/server` imports and re-exports that one
binding, so the two halves of the repo cannot drift. The server had the same hole
one line further on: `search` was escaped and `folderId` was not, though both
arrive from the client by the same route. Both are escaped now.

The shared drives and the "Shared with me" row lead the root listing instead of
trailing its first page, so the ways out of My Drive stay above a second page of
My Drive children.

`@useupup/storybook-config` gains `googleDrive.sharedDrives`, read from
`VITE_GOOGLE_SHARED_DRIVES` and on only for the exact string `'true'`, mirroring
the prop's own default — the flag could not be exercised from Storybook before.

Nothing changes when the flag is off: no widened params, no `drives.list`, no
`sharedWithMe` query and no extra rows.
