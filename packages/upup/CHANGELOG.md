# upup-react-file-uploader

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
