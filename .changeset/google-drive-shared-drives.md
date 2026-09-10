---
'@useupup/core': patch
'@useupup/vanilla': patch
---

The Google Drive picker can reach shared drives, behind a default-off
`cloudDrives.googleDrive.sharedDrives` flag.

`GoogleDrivePlugin.loadFiles` and `loadMoreFiles` sent a Drive v3 `files.list`
with no `corpora`, no `includeItemsFromAllDrives` and no `supportsAllDrives`, so
the API answered from the signed-in user's own My Drive corpus only. For a
business account that is most of the person's files: a file living in a shared
drive never appeared at any depth, and the picker's search box did not
compensate because it filters the children already loaded rather than issuing a
query. The requested scope was never the limit — `drive.readonly` covers shared
drives already.

With `sharedDrives: true` both listing calls now send `corpora=allDrives`,
`includeItemsFromAllDrives=true` and `supportsAllDrives=true`, and the
single-file download sends `supportsAllDrives=true` so a file the widened
listing surfaced can actually be fetched instead of answering 404. `corpora` and
`includeItemsFromAllDrives` are `files.list`-only and stay off the download.

The flag defaults off and nothing is sent when it is unset or false, so no
existing picker changes shape. `'<parentId>' in parents` still bounds each
listing, so this widens what the picker can reach and download, not what the
root view enumerates on its own.
