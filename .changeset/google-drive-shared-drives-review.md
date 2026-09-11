---
'@useupup/core': patch
'@useupup/server': patch
---

Review fixes for the Google Drive shared-drives support that shipped in 3.3.1,
behind the same default-off `cloudDrives.googleDrive.sharedDrives` flag. Nothing
changes for a picker that leaves the flag unset.

A `drives.list` failure — a 403 under a Workspace sharing policy, a 429, a 5xx —
now degrades to no shared-drive rows instead of taking the whole root listing
down with it. The call was awaited unguarded inside `loadFiles`, so for a user
with the flag on, one non-2xx from that endpoint threw away the My Drive
children the listing had already fetched and left the picker empty. The failure
is reported on a new non-fatal `google-drive:shared-drives-error` event, and
drives collected before a mid-pagination failure are kept.

Drive folder ids are escaped into the `files.list` query instead of interpolated
raw, using the same `escapeDriveQueryValue` the server-mode drive client uses.
That escaper moved from `@useupup/server` into `@useupup/core/internal` and
`@useupup/server` re-exports it, so the two halves share ONE implementation that
cannot drift.

The shared-drive rows and the virtual "Shared with me" row lead the root's first
page rather than trailing it, so they stay above a second page of My Drive files
instead of being pushed below one. They are still emitted on the first page only,
so they appear exactly once and pagination is unaffected in either view.
