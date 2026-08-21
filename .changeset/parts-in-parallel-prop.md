---
'@upupjs/core': minor
'@upupjs/react': minor
'@upupjs/vue': minor
'@upupjs/svelte': minor
'@upupjs/angular': minor
'@upupjs/vanilla': minor
'@upupjs/preact': minor
'@upupjs/next': minor
---

Two follow-ups to the multipart hardening round:

- **`resumable.maxConcurrentParts`** (default `3`): the parts-of-one-file
  concurrency cap is now public on the multipart config. More parts in flight
  buys throughput on high-bandwidth links and costs memory and sockets — each
  in-flight part holds its own chunk. Values below 1 are clamped to 1. This is
  a different axis from `maxConcurrentUploads` (files in parallel); the two
  multiply.
- **`networkAware` is now a component prop** on every framework port (it was
  headless-only). It remains on by default — passing nothing keeps the
  offline-pauses / online-resumes behavior; `networkAware={false}` opts out.
  Omitting the prop deliberately forwards `undefined` so core's default-on
  applies.
