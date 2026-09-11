---
'@useupup/core': patch
---

The default source set no longer shows capture sources whose output can never
satisfy `allowedFileTypes` (#340).

`allowedFileTypes: 'application/pdf'` used to leave the camera, microphone and
screen chips in place, and every recording they produced was rejected the moment
it was added. `normalizeUploaderOptions` now drops a default capture source when
no entry in the resolved accept list could match anything that source can emit —
camera emits `image/jpeg` (with `image/png` as the `toDataURL` fallback),
microphone `audio/webm` / `audio/ogg` / `audio/mp4`, screen `video/webm` /
`video/mp4`, all read off the code that builds the `File`.

The match fails open: a wildcard, an unrecognized extension, or anything that is
neither a MIME type nor an extension keeps every source. `local` and `url` are
never filtered, cloud drives are untouched, and an explicitly passed `sources`
array is always honored verbatim. A dropped source logs one dev-only
`console.warn` naming the source and the accept list.
