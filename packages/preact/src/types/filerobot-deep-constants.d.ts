// react-filerobot-image-editor ships no .d.ts for this pure-data subpath.
// It is the source of truth for the parity test (values === the root TABS/TOOLS export).
declare module 'react-filerobot-image-editor/lib/utils/constants' {
    export const TABS_IDS: Record<string, string>
    export const TOOLS_IDS: Record<string, string>
}
