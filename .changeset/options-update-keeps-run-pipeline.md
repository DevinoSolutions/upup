---
'@useupup/core': patch
---

`upload()` no longer crashes with "Cannot read properties of null (reading 'processAll')" when options are updated while it prepares the pipeline. `updateOptions()` now rebuilds the auto-pipeline only when a pipeline flag changes value, not whenever one is passed again, and a run keeps the pipeline it started with. The framework packages pass every option on each re-render, which made the crash common with `imageCompression`, `checksumVerification` and the other pipeline flags.
