---
'@useupup/react': patch
'@useupup/preact': patch
---

Image editor menus now open on top of the editor. Filerobot's menus (watermark
type, zoom, font and colour pickers) are portalled to `<body>` at z-index 1300,
which put them underneath the inline editor (z-9999) and the modal editor
(z-2147483647). Clicking "Add watermark" or the zoom control appeared to do
nothing, because the menu opened out of sight. The editor's style overrides now
lift those menus to the top layer.
