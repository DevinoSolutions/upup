# Playground UX — deep pass

**Date:** 2026-04-18
**Branch:** v2-clean
**Scope:** Every category audited via Chrome DevTools. Below are the
concrete UX issues found and prioritised fixes. Each numbered item is a
discrete change that can ship on its own.

Total surface: 10 categories, 73 entries.

---

## What's wrong, by category

### Sources (2 entries)

- **Text-only checkboxes.** 9 sources render as a grid of checkbox +
  label (`local`, `google_drive`, `onedrive`, `dropbox`, `box`, `url`,
  `camera`, `microphone`, `screen`). `google_drive` appears as raw
  snake_case. No visual identity per source.
- **Selection feedback.** When a source is checked, the only indicator
  is the checkmark — no colour change, no brand recognition.
- **"Show 'Select folder' button"** at the bottom is orphan: it's a
  behaviour toggle but lives in Sources.

### Events (24 entries)

- **24 identical-looking toggles** stacked vertically. Every label is
  a camelCase callback name (`onFilesSelected`, `onFileClick`, etc.)
  with the same description: "Log to console with payload when
  `onFoo` fires." No grouping by lifecycle phase.
- **No event log.** The whole point of turning a callback on is to see
  when it fires and with what arguments — currently that output only
  lands in devtools console. Zero feedback inside the playground.

### Limits (5 entries)

- **3× repeated Size+Unit pattern.** `maxFileSize`, `minFileSize`,
  `maxTotalFileSize` each render as a nested box with two stacked
  rows: `Size [n]` then `Unit [B|KB|MB|GB]`. Vertical space waste:
  ~180px per block. Same pattern for all three.
- **`Accept (MIME pattern)`** is a text input — no examples, no
  autocomplete for common values (`image/*`, `application/pdf`, etc.).

### Advanced — self-host (11 entries)

- **6 empty URL/key text inputs** stacked vertically. No inline hint
  where the values come from. A newcomer who opens this won't know
  which pairs work together (tokenEndpoint vs serverUrl vs apiKey).
- **Cloud drive credentials:** 4 nested blocks (Google Drive, OneDrive,
  Dropbox, Box) each exposing just a `Client ID` input. No icon per
  drive, no brand colour, no "where do I get this" link. They're
  visually indistinguishable.
- **`Auto-configure S3 CORS`** is duplicated — already in Behavior.

### Appearance (4 entries)

- **Primary color is a text input.** Consumer has to know hex syntax.
  Should be a native `<input type="color">` with a hex readout.
- **Slot overrides panel** lists 8 empty text inputs with technical
  slot paths (`sourceSelector.adapterButton`, `progressBar.fill`, …).
  Easy to mistype; no feedback about whether the string landed.

### Editor (4 entries)

- **Output quality** is a number input with min 0 / max 1 / step 0.1.
  Should be a slider — all consumers want to drag, not type 0.7.

### Upload (6 entries)

- **Defaults are invisible.** `Max concurrent uploads` and `Max retries`
  show as empty inputs even though the props default to 3 each. A
  visitor can't tell what the baseline is without reading the source.

### Behavior (8 entries)

- **`isProcessing (demo loading state)`** label is dev-speak. Should
  read "Demo: show loading state" with the internal prop name kept
  as description or an expand-to-show-code hint.
- **`Auto-configure S3 CORS`** duplicated from Advanced; remove one.
- **`Show 'Select folder' button`** lives in Sources (see above) and
  should move here — it's behaviour, not a source.

### Language (3 entries)

- **Two identical `<select>`s** for Locale + Fallback locale with the
  same 9 options. Works but feels heavy.
- **Message overrides** panel lists 4 arbitrary keys
  (`common.upload`, `common.cancel`, `dropzone.label`,
  `header.filesSelected`). No hint about what the defaults are, and
  no indication how to override more than these four.

### Processing (6 entries)

- **6 toggles** with tiny descriptions. Works but visually flat —
  every pipeline step is binary and no dependency is shown (e.g.,
  HEIC conversion is only useful if the file happens to be HEIC).

---

## Prioritised fix list

### P1 — Biggest UX gain per hour

1. **Source icon tiles.** Replace the checkbox + text grid with icon
   tiles: each source is a card showing its brand icon (Google Drive
   coloured logo, OneDrive, Dropbox, Box, plus generic device / url /
   camera / mic / screen). Active cards get a ring + tinted bg.
   Labels humanised ("Google Drive" not "google_drive").

2. **Live event log panel below the preview.** When any `onXxx`
   toggle is on, fired events append to a rolling panel: timestamp,
   name, JSON-preview of args, expand-to-inspect. Clears with the
   preset Reset button. Makes the 24 event toggles useful without
   devtools. (Pairs with grouping the Events category below.)

3. **Compact Size+Unit in Limits.** Collapse each nested block to a
   single row: `Max file size  [n] [B|KB|MB|GB]`. Saves ~360px of
   vertical scroll.

4. **Cloud drive credential icons.** Each of the 4 nested blocks gets
   its brand icon in the legend plus a one-liner pointing at the
   docs URL for obtaining keys.

### P2 — Feel-good polish

5. **Group Events by lifecycle.** Sub-headings within the Events
   category: Selection / Upload / Drag & drop / Errors / Processing.
   Cuts cognitive load from 24-to-1 scroll to 5-to-1 skim.

6. **Color picker for `theme.tokens.color.primary`.** Native
   `<input type="color">` alongside a read-only hex readout.

7. **Slider for `imageEditor.output.quality`.** Range input + current
   numeric value.

8. **Default-value placeholders on number inputs.** Show the true
   default as the placeholder so empty-state ≠ unknown state.
   (`Max concurrent uploads` placeholder "3", etc.)

9. **De-duplicate Auto-configure S3 CORS.** Remove from Behavior,
   keep in Advanced.

10. **Rename dev-speak labels.** `isProcessing (demo loading state)`
    → "Demo: show loading state". Similar pass for any other
    camelCase-in-UI.

### P3 — Nice-to-have

11. **Accept preset chips** ("Images only", "PDFs", "Videos",
    "Any file") that drop the right `accept` value in.

12. **Message overrides**: show the current translated default as the
    input placeholder so consumers see what they're replacing.

13. **Docs link per entry.** `ToggleEntry.docsLink` exists in the
    type and is never rendered — plug an `i` glyph next to the
    label that opens the docs anchor.

14. **Show-code toggle on the preview.** One-click toggle to swap
    preview for the generated `<UpupUploader …/>` snippet. We have
    a Code tab but a smaller split view next to controls helps while
    tweaking.

---

## Execution order recommendation

1. Ship **P1 #1 (source icons)** first — highest-visibility win, also
   the user's explicit top complaint.
2. Then **P1 #2 (event log)** — this is the feature that finally
   makes the Events category useful.
3. **P1 #3 (compact Size+Unit)** and **P2 #8 (default placeholders)**
   — quick cleanup.
4. **P2 #5 (group events)** after #2 so the grouping has something
   to feed into.
5. **P1 #4 (cloud icons)** alongside #1 (same iconography work).
6. Remaining P2/P3 items as time allows.

Rough timings: P1 is half a day end to end, P2 is another half day.

---

## Appendix — what's already OK

- Segmented enum controls (provider, theme.mode, resumable.mode, etc.).
- Collapsed-by-default categories on load.
- Quick-start preset bar with icons.
- Advanced credentials hidden behind their own category.
- All v1 legacy props removed from the public type.
