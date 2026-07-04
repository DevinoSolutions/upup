---
'@upup/server': minor
'@upup/core': patch
'@upup/react': patch
'@upup/next': patch
'@upup/angular': patch
'@upup/vanilla': patch
---

lens-debt small fixes (F-605, F-606, F-651, F-652, F-657):

- angular + vanilla: the file-preview Escape-close now binds a `window` keydown
  listener (matching react/vue/svelte), fixing a silent no-op when the modal
  opens from a click outside the portal subtree
- react: the headless `useUpupUpload`'s `getDropzoneProps` drag/drop/paste now
  route through the same `DragDropController` the visual panel uses, so
  `enablePaste`/`isProcessing`/folder-drop/filename-normalization are honored
  headlessly too (`UseUpupUploadOptions` gains `enablePaste`/`disableDragDrop`/
  `isProcessing`/`folderUpload`/`onWarn`)
- server: a new `@upup/server/node-bridge` subpath (`toWebRequest`/
  `writeWebResponse`) is the one Node<->Web bridge for express/fastify/
  `@upup/next`'s pages-handler, replacing three drifted hand-rolled copies
- server: `createUpupPlugin` (fastify) accepts an optional `{ path }` to
  override its previously-hardcoded `/upup/*` mount path
- server: `createUpupHandler` now throws at construct time if `storage.type`
  has no S3-compatible surface (currently just `azure`) instead of silently
  accepting a config that could never upload anything
