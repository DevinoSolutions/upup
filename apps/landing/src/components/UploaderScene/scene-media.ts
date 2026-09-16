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
        // The hero movie's screen-capture beat (MockScreenShare) plays this clip.
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

// Every stock photo in the kit was exported at this size; the two video poster
// frames are 16:9 and the two logos are their own shapes.
const DEFAULT_PHOTO_SIZE = { width: 400, height: 300 } as const

const IMAGE_SIZES: Readonly<
    Record<string, { readonly width: number; readonly height: number }>
> = {
    [SCENE_MEDIA.videos.beachWaves.poster]: { width: 640, height: 360 },
    [SCENE_MEDIA.videos.screenShare.poster]: { width: 640, height: 360 },
    [SCENE_MEDIA.logos.upup]: { width: 3200, height: 679 },
    [SCENE_MEDIA.logos.devino]: { width: 1905, height: 580 },
}

/**
 * Intrinsic pixel dimensions for a scene asset, so every scene `<img>` can
 * carry `width`/`height`. Two reasons they are not optional:
 *
 *   - Lighthouse flags width/height-less images as a layout-shift risk on every
 *     page a scene renders on.
 *   - React 19 hoists an eagerly-loaded `<img>` into a `<link rel="preload"
 *     as="image">` at the top of the document. Eleven decorative scene photos
 *     were therefore being preloaded ahead of the CSS and fonts the hero COPY
 *     needs; pairing these attributes with `loading="lazy"` stops that.
 *
 * The scene images are all `object-cover` inside absolutely-positioned boxes,
 * so the attributes never change layout — they only describe the file.
 */
export function sceneImageSize(src: string | undefined): {
    readonly width: number
    readonly height: number
} {
    return (src && IMAGE_SIZES[src]) || DEFAULT_PHOTO_SIZE
}
