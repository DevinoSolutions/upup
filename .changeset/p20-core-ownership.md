---
'@upup/core': patch
---

core: `files` getter returns a read-only view (defensive clone); all collection
mutation is owned by FileManager (F-143 read-side, completing the P6 state
contract). Read-only consumers are unaffected.
