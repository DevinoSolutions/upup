# upup-react-file-uploader

## Unreleased

### Versioning Note

-   This release moves the modern npm package line from `1.5.2` to `2.0.0`. Older GitHub `v2.x` tags belong to a legacy code line and are not the baseline for this release.

### Breaking Changes

-   No required migration was identified for consumers upgrading from the published npm package `1.5.2`.
-   If you tested unpublished builds from `master` or `dev` after `1.5.2`, the full locale prop is now `localePack`, while `translations` remains the prop for partial overrides.

### Features

-   Added optional built-in image editing with inline and modal flows, configurable editor tabs and tools, and save/cancel hooks.
-   Added first-class localization with bundled locale packs, `localePack`, `translations`, and a `upup-react-file-uploader/locales` export.
-   Added resumable multipart uploads for S3-compatible providers, including pause/resume controls and persisted upload sessions.
-   Added richer progress feedback, including retry controls, uploaded-byte tracking, speed, ETA, and pause/play actions.
-   Added Google Workspace export support and native Google Drive export URLs to bypass the earlier 10 MB export limitation.
-   Expanded and hardened Google Drive, OneDrive, and Dropbox integrations, including better fallback/auth flows.

### Improvements

-   Improved mini-mode layout and responsive sizing.
-   Improved upload cancellation handling to avoid orphaned multipart uploads.
-   Expanded automated coverage with new Jest and Playwright tests around uploads, image editing, and multipart helpers.

### Migration

-   Existing `1.5.2` integrations can keep their current upload flow and adopt the new features incrementally.
-   To enable localization on this release line, pass a full locale pack via `localePack` and use `translations` for per-key overrides.
-   To enable image editing, install the optional editor peer dependencies before turning on `imageEditor`.

## 1.0.0

### 1.0.0 Major changes

-   Initial release

## 1.0.1

### 1.0.1 Major changes

-   Bug fixes

## 1.0.2

### 1.0.2 Major changes

-   Bug fixes

## 1.1.0

### Features

-   Added new `customProps` prop for passing custom provider-specific configurations
-   Added `enableAutoCorsConfig` prop to control automatic CORS configuration for S3 providers

### Fixes

-   Resolved file preview rendering issues
-   Fixed unmet peer dependencies warning
-   Replaced problematic install command in CI/CD pipelines
-   Improved file preview styling layout
-   Enhanced default warning and error message styling
-   Minor styling fixes and consistency improvements

### Maintenance

-   Updated build scripts and documentation

## 1.2.0

### Features

-   Extracted CSS to a separate file that can be imported explicitly to solve styling precedence issues
-   Added new CSS export path via `upup-react-file-uploader/styles`

### Fixes

-   Fixed CSS precedence issues when host projects use SCSS that loads after package styles
-   Improved component styling to better handle external style overrides
-   Changed "cancel" button text to "remove all files" in files preview state
-   Removed supported file type text from component UI for cleaner interface

### Maintenance

-   Updated build configuration to extract CSS instead of injecting it
-   Updated documentation to include instructions for proper CSS import ordering
