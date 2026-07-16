// ─────────────────────────────────────────────────────────────────────────────
// scene-media — the single source of truth for every stock asset the
// UploaderScene mocks reference. All paths resolve against `apps/landing/public`
// (license-free photos/clips downloaded into `public/scene`; the brand logos live
// under `public/img` / `public`). One exported manifest object keeps each entry
// from becoming a separate unused export (knip) and gives the scenes one import.
// ─────────────────────────────────────────────────────────────────────────────

export const SCENE_MEDIA = {
    photos: {
        yosemiteValley: '/scene/yosemite-valley.jpg',
        portrait: '/scene/portrait.jpg',
        riverCanyon: '/scene/river-canyon.jpg',
        canyonCliffs: '/scene/canyon-cliffs.jpg',
        mountainLake: '/scene/mountain-lake.jpg',
        puppy: '/scene/puppy.jpg',
        waterfall: '/scene/waterfall.jpg',
        pinkBlossoms: '/scene/pink-blossoms.jpg',
        strawberries: '/scene/strawberries.jpg',
        streetMarket: '/scene/street-market.jpg',
    },
    videos: {
        beachWaves: {
            src: '/scene/beach-waves.mp4',
            poster: '/scene/beach-waves-poster.jpg',
        },
        // Reserved for a later scene task (screen-capture source) — kept here so
        // the manifest stays the one place scene assets are named.
        screenShare: {
            src: '/scene/screen-share.mp4',
            poster: '/scene/screen-share-poster.jpg',
        },
    },
    logos: {
        upup: '/img/logo-dark.png',
        devino: '/devino.png',
    },
} as const
