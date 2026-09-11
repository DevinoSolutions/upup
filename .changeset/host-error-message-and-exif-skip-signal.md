---
'@useupup/core': patch
'@useupup/react': patch
'@useupup/vue': patch
'@useupup/svelte': patch
'@useupup/angular': patch
'@useupup/vanilla': patch
---

The default panel now shows your error message next to the machine code, and a
skipped EXIF strip leaves a marker on the file (#367 items 2 and 4).

A failure carrying a code used to render as `uploadFailedWithCode`, which
interpolated the code and nothing else — so an endpoint that returned a useful
sentence watched it disappear between `onError` and the panel. The key now has a
second `{message}` slot carrying the error's own message, added to all nine
locale bundles so translators control placement (override the key to reorder the
slots, drop the code, or show only your own wording). All six framework panels
pass both values, and the message is rendered as text, never as markup.

`stripExifData` skips animated GIF/WebP/APNG because canvas has no animated
encoder, which means an animated WebP or APNG reaches storage with the EXIF you
asked to remove. The `exif` step now records that on the file:
`metadata.metadataStripSkipped === true` with
`metadata.metadataStripSkippedReason === 'animated-image'`. A file whose EXIF
really was stripped carries `exifStripped: true` and no marker, and
`imageCompression` skipping an animated image does not set it — nothing was asked
to be removed. No new event, no new option.
