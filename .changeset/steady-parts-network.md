---
'@upupjs/core': minor
---

Multipart transfer-layer hardening: per-part retries with a stall watchdog,
connectivity-aware pause/resume, an opt-in crash-restore auto-resume, and a
client-side guard for S3's 10,000-part cap.

**What shipped**

- **Per-part retry with backoff — new `resumable.retryDelays`** (default
  `[0, 1000, 3000, 5000]`, the same vocabulary tus uses; `[]` disables). A
  part whose sign or PUT fails transiently — network error, watchdog timeout,
  HTTP `429`, any `5xx` — is retried on this schedule instead of failing the
  file. Definitive rejections (`403` forged token, `400`) still fail
  immediately. The retry delay is abort-aware: `pause()`/cancel cuts the wait
  short. Part retries sit inside one run; `maxRetries` still governs whole-run
  retries around them.
- **Part stall watchdog — new `resumable.partTimeoutMs`** (default `180000`).
  A part attempt that gets no response within the window is aborted and
  surfaces as a retryable `UpupErrorCode.TIMEOUT` instead of hanging the
  upload on a dead connection forever. Applies to both the sign call and the
  PUT. The 3-minute default still lets a full 5 MiB part through a
  ~230 kbit/s link.
- **Connectivity awareness — new core option `networkAware`** (default on,
  no-op outside a browser). Going offline mid-upload pauses the run — with
  multipart `persist` on, that keeps the server-side session alive instead of
  burning whole-run retries against a dead network — and coming back online
  resumes it. `online` only ever resumes a pause the offline handler made; a
  pause the user chose is never overruled. `false` restores the previous
  fail-and-retry behavior.
- **Opt-in auto-resume — new `resumable.autoResume`** (default off). With it
  on, a crash-restored multipart upload continues by itself instead of
  waiting for the Resume click. Off by default because closing a tab is as
  often "cancel" as "oops" — the explicit click stays the shipped-UI default.
- **10,000-part cap client fallback.** When an init response carries no
  `partSize`, the client now sizes parts as
  `max(chunkSizeBytes, ceil(fileSize / 10000))` instead of trusting the raw
  chunk size — without this, a >48.8 GiB file against a partSize-less server
  would fail at part 10,001. The server's `partSize` still wins whenever
  present (`@upupjs/server` already clamps it the same way, now pinned by
  boundary tests).
