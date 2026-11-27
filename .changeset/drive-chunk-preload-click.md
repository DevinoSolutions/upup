---
'@useupup/react': patch
---

The first click on a Dropbox, OneDrive or Box source tile now opens the sign-in popup inside the click once that source's chunk has loaded, which makes Edge and other strict popup blockers far less likely to refuse it ("Popup was blocked by the browser"). The drive views are separate lazy chunks, and the click used to fetch the chunk, show the loading fallback and only start sign-in after the chunk arrived, in a later task than the click. The three popup-drive chunks are now fetched as soon as the source selector is shown (after first paint, only for configured sources), and any lazy source's chunk is fetched on pointer-enter or focus of its tile. Once a chunk has loaded, its view renders in the click's own render instead of suspending. A click that lands before the chunk has arrived still takes the old path, and the "Sign in" button remains the in-click fallback there. The chunks stay separate lazy chunks.
