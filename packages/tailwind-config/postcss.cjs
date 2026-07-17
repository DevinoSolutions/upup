/**
 * Shared PostCSS config factory for the upup UI packages (react/vue/svelte/vanilla/angular).
 * Each consumer's postcss.config.cjs is one line:
 *   module.exports = require('@upupjs/tailwind-config').createPostcssConfig({
 *     content: ['./src/<glob>'],
 *   })
 *
 * The ONLY per-framework knob is `content` (the source-file glob set). Everything else — the
 * tailwind theme, the `.upup-scope` prefixing, autoprefixer — is identical across all five and
 * lives here.
 */
function createPostcssConfig({ content }) {
    const contentGlobs = Array.isArray(content) ? content : [content]
    return {
        plugins: [
            require('tailwindcss')({
                prefix: 'upup-',
                darkMode: 'class',
                corePlugins: { preflight: true },
                content: [
                    ...contentGlobs,
                    // Brand-icon color classes (upup-text-[#hex]) live in @upupjs/core's icon registry.
                    // Relative to the consuming package's cwd at build time (../core == packages/core).
                    '../core/src/icons/registry.ts',
                ],
                // The upup-fx layer is defined once (see upupFxPlugin below) but
                // nothing references its classes until the Phase-3 component work,
                // so the JIT purge would drop them. Safelisting the fx component
                // classes + the fx animation utilities forces the plugin's rules
                // and their `@keyframes` into the artifact by construction.
                // Lifecycle: the component/animation entries become removable
                // once Phase-3 markup references them, but 'upup-fx-essential'
                // must STAY safelisted forever — it's the candidate that forces
                // the kill-switch + reduced-motion selectors (which reference it
                // only inside :not()) to emit, and no real markup may ever carry
                // it, so nothing else keeps those rules alive.
                safelist: [
                    'upup-scope',
                    'upup-fx-hover-lift',
                    'upup-fx-press',
                    'upup-fx-icon-nudge',
                    'upup-fx-sheen-sweep',
                    'upup-fx-remove',
                    'upup-fx-overlay-slide',
                    'upup-fx-essential',
                    'upup-animate-fx-enter',
                    'upup-animate-fx-exit',
                    'upup-animate-fx-view',
                    'upup-animate-fx-pop',
                    'upup-animate-fx-draw',
                    'upup-animate-fx-sheen',
                    'upup-animate-fx-dash-march',
                ],
                theme: {
                    extend: {
                        containers: { cs: '475px' },
                        keyframes: {
                            'informer-in': {
                                '0%': {
                                    opacity: '0',
                                    transform: 'translateY(8px)',
                                },
                                '100%': {
                                    opacity: '1',
                                    transform: 'translateY(0)',
                                },
                            },
                            'hint-pulse': {
                                '0%, 100%': {
                                    borderColor: 'rgba(148,163,184,0.35)',
                                },
                                '50%': {
                                    borderColor: 'rgba(56,189,248,0.55)',
                                },
                            },
                            'hint-bob': {
                                '0%, 100%': { transform: 'translateY(0)' },
                                '50%': { transform: 'translateY(-4px)' },
                            },
                            'fx-enter': {
                                '0%': {
                                    opacity: '0',
                                    transform: 'translateY(6px) scale(0.98)',
                                },
                                '100%': {
                                    opacity: '1',
                                    transform: 'translateY(0) scale(1)',
                                },
                            },
                            'fx-exit': {
                                '0%': { opacity: '1', maxHeight: '96px' },
                                '100%': {
                                    opacity: '0',
                                    maxHeight: '0',
                                    marginTop: '0',
                                    marginBottom: '0',
                                    paddingTop: '0',
                                    paddingBottom: '0',
                                },
                            },
                            'fx-view': {
                                '0%': {
                                    opacity: '0',
                                    transform: 'translateY(12px)',
                                },
                                '100%': {
                                    opacity: '1',
                                    transform: 'translateY(0)',
                                },
                            },
                            'fx-pop': {
                                '0%': { transform: 'scale(0.6)' },
                                '60%': { transform: 'scale(1.12)' },
                                '100%': { transform: 'scale(1)' },
                            },
                            'fx-draw': {
                                '0%': { strokeDashoffset: '24' },
                                '100%': { strokeDashoffset: '0' },
                            },
                            'fx-sheen': {
                                '0%': { transform: 'translateX(-100%)' },
                                '100%': { transform: 'translateX(300%)' },
                            },
                            'fx-dash-march': {
                                '0%': { strokeDashoffset: '0' },
                                '100%': { strokeDashoffset: '-24' },
                            },
                        },
                        animation: {
                            'informer-in': 'informer-in 0.2s ease-out both',
                            'hint-pulse':
                                'hint-pulse 2.4s ease-in-out infinite',
                            'hint-bob': 'hint-bob 2.4s ease-in-out infinite',
                            'fx-enter':
                                'fx-enter var(--upup-fx-base) var(--upup-fx-ease) both',
                            'fx-exit':
                                'fx-exit var(--upup-fx-base) var(--upup-fx-ease) both',
                            'fx-view':
                                'fx-view var(--upup-fx-base) var(--upup-fx-ease) both',
                            'fx-pop':
                                'fx-pop var(--upup-fx-base) var(--upup-fx-ease) both',
                            'fx-draw': 'fx-draw 400ms var(--upup-fx-ease) both',
                            'fx-sheen': 'fx-sheen 1.6s linear infinite',
                            'fx-dash-march': 'fx-dash-march 8s linear infinite',
                        },
                    },
                },
                plugins: [
                    require('@tailwindcss/container-queries'),
                    // The upup-fx layer: defined ONCE here so all six frameworks
                    // inherit identical rules by construction. A copy of any fx
                    // rule in a package's tailwind.css is a defect (see CLAUDE.md
                    // naming vocabulary).
                    function upupFxPlugin({ addComponents }) {
                        // Class keys are written UNPREFIXED: tailwind's
                        // `prefix: 'upup-'` prepends it exactly once, so `.scope`
                        // becomes `.upup-scope` and `.fx-*` becomes `.upup-fx-*`.
                        // Hardcoding the prefix here would double it
                        // (`.upup-upup-fx-*`). The `[class*='upup-fx-']` matcher
                        // stays literal — it targets the runtime class name, not a
                        // tailwind candidate, so the prefix must not be stripped.
                        addComponents({
                            // Motion tokens — the ONE place timing lives.
                            // `.upup-scope` is the outermost wrapper every
                            // framework renders, and the prefix-selector pass
                            // leaves it un-re-prefixed (idempotence guard).
                            '.scope': {
                                '--upup-fx-fast': '150ms',
                                '--upup-fx-base': '200ms',
                                '--upup-fx-overlay': '350ms',
                                '--upup-fx-ease':
                                    'cubic-bezier(0.22, 1, 0.36, 1)',
                            },
                            '.fx-hover-lift': {
                                transition:
                                    'transform var(--upup-fx-fast) var(--upup-fx-ease), box-shadow var(--upup-fx-fast) var(--upup-fx-ease), background-color var(--upup-fx-fast) var(--upup-fx-ease)',
                            },
                            '.fx-hover-lift:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow:
                                    '0 4px 16px rgba(14, 165, 233, 0.15)',
                            },
                            '.fx-press:active': {
                                transform: 'scale(0.97)',
                            },
                            '.fx-icon-nudge svg': {
                                transition:
                                    'transform var(--upup-fx-fast) var(--upup-fx-ease)',
                            },
                            '.fx-icon-nudge:hover svg': {
                                transform: 'translateY(-2px) scale(1.08)',
                            },
                            '.fx-sheen-sweep': {
                                position: 'relative',
                                overflow: 'hidden',
                            },
                            '.fx-sheen-sweep::after': {
                                content: "''",
                                position: 'absolute',
                                inset: '0',
                                width: '40%',
                                transform: 'translateX(-120%)',
                                background:
                                    'linear-gradient(105deg, transparent, rgba(255,255,255,0.18), transparent)',
                                transition:
                                    'transform 600ms var(--upup-fx-ease)',
                                pointerEvents: 'none',
                            },
                            '.fx-sheen-sweep:hover::after': {
                                transform: 'translateX(300%)',
                            },
                            '.fx-remove': {
                                transition:
                                    'color var(--upup-fx-fast) var(--upup-fx-ease), transform var(--upup-fx-fast) var(--upup-fx-ease)',
                            },
                            '.fx-remove:hover': {
                                color: '#f87171',
                                transform: 'rotate(90deg)',
                            },
                            // Add-more source overlay: the source surface slides
                            // up over the still-mounted, dimmed file list. Timing
                            // is the dedicated `--upup-fx-overlay` token (350ms).
                            // The keyframe lives here (not theme.animation) so the
                            // whole rule ships from the ONE fx plugin; the class
                            // key stays UNPREFIXED (tailwind's prefix makes it
                            // `.upup-fx-overlay-slide`) and the `upup-fx-` substring
                            // keeps it inside the `[data-motion='off']` kill gate.
                            '.fx-overlay-slide': {
                                animation:
                                    'fx-overlay-slide var(--upup-fx-overlay) var(--upup-fx-ease) both',
                            },
                            '@keyframes fx-overlay-slide': {
                                '0%': {
                                    opacity: '0',
                                    transform: 'translateY(100%)',
                                },
                                '100%': {
                                    opacity: '1',
                                    transform: 'translateY(0)',
                                },
                            },
                            // The kill switch: data-motion="off" (written by core
                            // onto the uploader-panel element) disables every fx
                            // rule EXCEPT the essential carve-out (spinner,
                            // progress width, focus rings). It gates BOTH fx class
                            // families: the `.upup-fx-*` component rules AND the
                            // `.upup-animate-fx-*` keyframe utilities — the latter
                            // has no `upup-fx-` substring, so a single
                            // `[class*='upup-fx-']` matcher would let every fx-*
                            // animation escape the gate.
                            "[data-motion='off'] :is([class*='upup-fx-'], [class*='upup-animate-fx-']):not(.fx-essential)":
                                {
                                    animation: 'none !important',
                                    transition: 'none !important',
                                },
                            "[data-motion='off'] :is([class*='upup-fx-'], [class*='upup-animate-fx-']):not(.fx-essential)::after":
                                {
                                    animation: 'none !important',
                                    transition: 'none !important',
                                },
                            // Defense-in-depth for SSR'd markup before hydration
                            // writes data-motion:
                            '@media (prefers-reduced-motion: reduce)': {
                                ":is([class*='upup-fx-'], [class*='upup-animate-fx-']):not(.fx-essential)":
                                    {
                                        animation: 'none !important',
                                        transition: 'none !important',
                                    },
                            },
                        })
                    },
                ],
            }),
            require('postcss-prefix-selector')({
                prefix: '.upup-scope',
                transform(prefix, selector, prefixedSelector) {
                    if (selector.startsWith('@')) return selector
                    // Idempotent: never re-prefix an already-scoped selector. Safe for all frameworks —
                    // on a single-pass src->dist build no selector contains `.upup-scope` yet, so this
                    // never fires; for re-processed dist CSS (e.g. @storybook/angular's postcss-loader
                    // resolving this config relative to dist/) it prevents a doubled `.upup-scope`.
                    if (selector.indexOf('.upup-scope') !== -1) return selector
                    return prefixedSelector
                },
            }),
            require('autoprefixer'),
        ],
    }
}

module.exports = { createPostcssConfig }
