---
'@useupup/core': patch
'@useupup/vanilla': patch
'@useupup/server': patch
---

The Google Drive picker can browse shared drives and "Shared with me", behind a
default-off `cloudDrives.googleDrive.sharedDrives` flag.

`GoogleDrivePlugin.loadFiles` and `loadMoreFiles` sent a Drive v3 `files.list`
with no `corpora`, no `includeItemsFromAllDrives` and no `supportsAllDrives`, so
the API answered from the signed-in user's own My Drive corpus only. For a
business account that is most of the person's files: a file living in a shared
drive never appeared at any depth, and the picker's search box did not
compensate because it filters the children already loaded rather than issuing a
query. The requested scope was never the limit — `drive.readonly` covers shared
drives, and `drives.list`, already.

With `sharedDrives: true`:

- Both listing calls send `corpora=allDrives`, `includeItemsFromAllDrives=true`
  and `supportsAllDrives=true`, and the single-file download sends
  `supportsAllDrives=true` so a file the widened listing surfaced can actually be
  fetched instead of answering 404. `corpora` and `includeItemsFromAllDrives` are
  `files.list`-only and stay off the download.
- The ROOT listing appends the user's shared drives, from a paginated
  `drives.list`, as navigable folder rows after the My Drive children. Those
  params widen which files a query CAN return, but every listing is still
  `'<parentId>' in parents` and `'root'` resolves to My Drive root — so without
  an entry to click, a shared drive stayed unreachable. A shared drive's root
  folder id IS its drive id, so once one is listed the ordinary parent listing
  walks it with no further special-casing.
- The root listing also carries one virtual "Shared with me" folder. Drive has no
  parent whose children are the files others shared with you — it is the query
  `sharedWithMe = true` — so that row uses a synthetic id the plugin branches on
  in both `loadFiles` and `loadMoreFiles`. Every other part of the picker treats
  it as an ordinary folder.

Both additions lead the root's first page and are never repeated on a
continuation page, so they appear exactly once, stay above a second page of My
Drive files, and pagination is unaffected in either view.

A `drives.list` failure — a 403 under a Workspace sharing policy, a 429, a 5xx —
degrades to no shared-drive rows rather than taking the whole root listing down
with it, and is reported on a new non-fatal `google-drive:shared-drives-error`
event. Drives collected before a mid-pagination failure are kept.

Drive folder ids are now escaped into the `files.list` query instead of
interpolated raw, using the same `escapeDriveQueryValue` the server-mode drive
client uses. That escaper moved from `@useupup/server` into
`@useupup/core/internal`, and `@useupup/server` re-exports it, so the two halves
share ONE implementation that cannot drift.

The flag defaults off. Nothing is sent, no `drives.list` is issued and no extra
row appears when it is unset or false, so no existing picker changes shape.
