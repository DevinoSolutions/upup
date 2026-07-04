---
'@upup/core': major
---

## Extract the popup-OAuth skeleton (`PopupOAuthPlugin`), formalize `init`, retire `ServerOAuth`

Refactors the client-mode cloud-drive plugins onto one shared base and cleans up
two dead abstractions. Three breaking changes, all internal or removals with no
production consumers:

- **`init(emitter)` is the single plugin lifecycle hook (F-607).** `UpupPlugin.setup(core)`
  is removed; `UpupPlugin` is now `{ name; init?(emitter) }`. `PluginManager.register`
  only dedups + stores; `UpupCore.use()` invokes `init` with core's event bus. A plugin
  can no longer register extensions from its lifecycle hook — use `core.registerExtension()`
  (no production plugin did lifecycle-time registration).

- **`BoxPlugin` gains proactive token refresh (F-126).** Box now parses `expires_in`,
  persists `upup_box_token_expiry`, and proactively refreshes within the 60 s window
  (previously reactive-only). Observable: one fewer round-trip after near-expiry, and a
  long-dead session with a known expiry is no longer reported authenticated. OneDrive and
  Dropbox already behaved this way; all three now share the `PopupOAuthPlugin` skeleton
  (F-121). Public plugin constructors + the `DrivePlugin` runtime surface are unchanged.

- **`ServerOAuth` (value) and `OAuthStrategy`, `OAuthTokens`, `RemoteFile` (types) are
  removed from `@upup/core` (F-655).** They had zero non-test consumers;
  `ServerModeDriveController` is the canonical server-mode drive abstraction. `CloudProvider`
  is retained.
