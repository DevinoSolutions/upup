---
title: upup vs react-dropzone
slug: /comparisons/upup-vs-react-dropzone
sidebar_position: 3
description: An honest comparison of upup and react-dropzone — a headless drag-and-drop primitive versus a full file uploader — so you can pick the right scope.
---

# upup vs react-dropzone

react-dropzone is a small, focused React hook (`useDropzone`) — with a matching
wrapper component — for building an HTML5-compliant drag-and-drop file-selection
zone. It is a **primitive, not a full uploader**: it hands you the selected or
dropped `File` objects and leaves the upload, UI, progress, previews, cloud
sources, and everything else to you. That's exactly what you want when you only
need drag-and-drop in React and will build the rest yourself. upup is a full
uploader — a headless core, native UI for six frameworks, and an optional server —
so the two really solve different problems. This page is here because teams often
start with the primitive and later need the whole flow.

## At a glance

| Feature                 | react-dropzone                                            | upup                                                               |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| Scope                   | Drag-and-drop file-selection primitive (hook + component) | Full uploader: selection, UI, upload pipeline, and server          |
| Native first-party UI   | No — you render your own; React only                      | React, Vue, Svelte, Angular, Vanilla JS, Preact                    |
| Headless core           | Yes (a hook) — but file selection only, no uploading      | Yes (`@upupjs/core`) — a full upload engine                        |
| License / pricing       | MIT, free & open source                                   | MIT, free & open source                                            |
| Uploading / self-host   | You implement uploads yourself, to any backend            | `@upupjs/server` presigns and proxies to any S3-compatible storage |
| Cloud-drive sources     | No                                                        | Google Drive, OneDrive, Dropbox, Box                               |
| Camera / screen capture | No                                                        | Yes (both)                                                         |
| Image editor            | No                                                        | Yes — React/Preact only                                            |
| Resumable uploads       | No                                                        | Yes — optional (tus or S3 multipart)                               |
| i18n                    | No                                                        | Yes (ICU locale bundles)                                           |

## Choose react-dropzone if

- You only need a drag-and-drop zone in React and will build the upload, UI, and
  progress yourself.
- You want the smallest, most unopinionated primitive, with no upload logic baked
  in.
- You already have an upload backend and UI and just need clean file selection.

## Choose upup if

- You want the drag-and-drop **and** the progress bar, previews, cloud drives,
  camera, resumable uploads, and a server — without assembling them yourself.
- You need more than React: Vue, Svelte, Angular, Vanilla JS, and Preact, all
  sharing one DOM contract.
- You'd rather configure a complete uploader than build one from a primitive.
