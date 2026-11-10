---
'@useupup/react': patch
'@useupup/vue': patch
'@useupup/svelte': patch
'@useupup/angular': patch
---

`onBeforeFileAdded` and `onFileProcessed` set or changed after mount now take effect. Vue, Svelte and Angular handed `onBeforeFileAdded` to core once at setup and copied `onFileProcessed` once as well, so a handler that arrived later was never asked or heard and the first one kept running. The processing stream now reads `onFileProcessed` when its message lands in all four packages, so React no longer delivers a stream that opened before a swap to the old handler.
