---
'@useupup/core': patch
---

Presign failures no longer surface a reverse proxy's HTML error page, and the
animated-image guard stops reading whole files.

`TokenEndpointCredentials.getPresignedUrl` reads a failed presign body so the
endpoint's own sentence reaches `onError`, but `parseErrorBody`'s text fallback
also caught the error pages nginx and Cloudflare write for a 502 or 413 — so a
handler that used to get `Presign request failed: 502 Bad Gateway` got 200
characters of `<html>` instead. A markup body carrying no error code is now
treated as nothing to surface and the status-line wording is kept. An S3-style
`<Error><Code>` body is unaffected: it parses to a real code and still comes
through. The error is also built with its final message rather than having
`message` reassigned afterwards, so the body is parsed once and the error never
carries wording it does not keep. `uploadErrorFromResponse` gained two optional
arguments for this — `fallbackMessage` (wording to use when the body carries
nothing) and `ignoreErrorPageBody` (opt into the markup guard); callers that
pass neither behave exactly as before.

`isAnimatedImage` — the guard that keeps `imageCompression` and `stripExifData`
from flattening animated GIF/WebP/APNG — used to call `arrayBuffer()` on the
whole file, a read the main-thread path never made before that guard existed,
so a still 40 MB photo was materialized in full just to learn it was still. It
now sniffs the first 64 KiB, which is where every one of these formats declares
animation (APNG's `acTL` before the first `IDAT`, WebP's `VP8X`/`ANIM` at the
top of the container, a looping GIF's `NETSCAPE2.0` extension in the header).
Only a GIF that has announced nothing by then is read in full, because its
second Image Descriptor can sit anywhere in the stream. Verdicts are unchanged.
