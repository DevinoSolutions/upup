---
title: upup vs Uppy
slug: /comparisons/upup-vs-uppy
sidebar_position: 1
description: An honest, factual comparison of upup and Uppy — two MIT-licensed file uploaders with headless cores, cloud drives, and resumable uploads — to help you choose.
---

# upup vs Uppy

Uppy (by Transloadit) is the most established open-source JavaScript uploader,
with a large, battle-tested plugin ecosystem and Companion, its mature server for
fetching files from remote sources. Both Uppy and upup are MIT-licensed and share
the same shape — a headless core plus framework UI, cloud-drive sources, camera,
image editing, and resumable uploads. The practical differences are in the UI
model and the server: upup ships a **native, DOM-identical UI implemented in each
framework's own idioms** across six frameworks (including Svelte 5, Angular
standalone, a framework-free build, and Preact), and its `@upupjs/server` includes
an HMAC-signed upload-token trust model out of the box. Uppy mounts one UI through
framework wrappers and has the deeper, more widely deployed plugin catalog.

## At a glance

| Feature                       | Uppy                                                                                                      | upup                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Native first-party UI         | Vanilla JS, React, Vue, Svelte, Angular                                                                   | React, Vue, Svelte, Angular, Vanilla JS, Preact                                                                      |
| Headless core                 | Yes (`@uppy/core`; recent major versions add headless components and hooks)                               | Yes (`@upupjs/core`)                                                                                                 |
| License / pricing             | MIT, free & open source (Transloadit is an optional paid hosted service)                                  | MIT, free & open source                                                                                              |
| Self-host incl. S3-compatible | Yes — your endpoint / tus server / S3 via the AWS S3 plugin; Companion (self-hostable) for remote sources | Yes — `@upupjs/server` presigns and proxies to any S3-compatible storage (AWS, MinIO, R2, Spaces, Wasabi, Backblaze) |
| Cloud-drive sources           | Google Drive, Dropbox, OneDrive, Box, Google Photos, Unsplash, and more (via Companion)                   | Google Drive, OneDrive, Dropbox, Box                                                                                 |
| Camera / screen capture       | Yes (Webcam, Screen Capture plugins)                                                                      | Yes (both)                                                                                                           |
| Image editor                  | Yes (Image Editor plugin)                                                                                 | Yes — React/Preact only                                                                                              |
| Resumable uploads             | Yes (tus, S3 multipart)                                                                                   | Yes — optional (tus or S3 multipart)                                                                                 |
| i18n                          | Yes (locale packs)                                                                                        | Yes (ICU locale bundles)                                                                                             |

## Choose Uppy if

- You want the most mature, most widely deployed option, with the largest and
  most battle-tested plugin ecosystem.
- You need Companion's server-side remote fetching for many providers (including
  Google Photos and Unsplash) or value its long production track record.
- Your team has already standardized on Uppy's plugin model.

## Choose upup if

- You want native UI implemented in each framework's idioms — including Svelte 5,
  Angular standalone, a framework-free build, and Preact — held DOM-identical by a
  parity harness, rather than one UI mounted through wrappers.
- You want a server with an HMAC-signed upload-token trust model built in, so the
  client can never assert the object key or S3 `uploadId` it writes to.
- You want cloud drives, camera, screen capture, image compression/HEIC, and
  resumable uploads from one MIT package set with a single DOM/parity contract.
