# Browser-Based Image Editor Libraries for React -- Comparison Report

**Date:** 2026-04-28
**Purpose:** Evaluate viable MIT/Apache-2.0 licensed image editor libraries for upup React file uploader

---

## Summary Table

| Library | License | Stars | npm Weekly DL | Bundle (gzip) | Crop | Rotate | Resize | Filters | Annotate | Undo/Redo | Flip | Maintained? |
|---------|---------|-------|---------------|---------------|------|--------|--------|---------|----------|-----------|------|-------------|
| **react-filerobot-image-editor** | MIT | ~1.8k | 18,475 | ~280 kB (938 kB min) | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Active (beta, 2 mo ago) |
| **Cropper.js v2** / react-cropper | MIT | 13.6k | 1.42M (core) / 396k (react) | 12.2 kB | Yes | Yes | Yes (via API) | No | No | No | Yes | Active (18 days ago) |
| **react-image-crop** | ISC | ~4.1k | 1.65M | <5 kB | Yes | No | No | No | No | No | No | Low (1 yr since last publish) |
| **react-easy-crop** | MIT | 2.7k | 1.78M | 6.9 kB | Yes | Yes | No | No | No | No | No | Active (1 mo ago) |
| **tui-image-editor** (Toast UI) | MIT | 7.3k | 27,031 | ~500 kB (fabric.js dep) | Yes | Yes | Yes | Yes | Yes (draw, text, shapes) | Yes | Yes | **DEAD** (last publish 4 yrs ago) |
| **Pintura** (Doka) | **Proprietary** | N/A | N/A | ~150 kB | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Active (commercial, $13-317/mo) |
| **react-avatar-editor** | MIT | ~2.5k | 537,753 | ~10 kB | Yes | Yes | No | No | No | No | No | Active (1 mo ago) |
| **Konva / react-konva** (DIY) | MIT | 11k+ | N/A | ~40 kB | DIY | DIY | DIY | DIY | DIY | DIY | DIY | Active |
| **react-advanced-cropper** | MIT | ~700 | ~50k | ~30 kB | Yes | Yes | Yes | No | No | No | Yes | Low (1 yr since last publish) |
| **react-photo-editor** | MIT | ~100 | <1k | ~15 kB (est) | No | Yes | No | Yes (b/c/s/gray) | Draw | No | Yes | Newer, low adoption |
| **ente-io/photo-editor-sdk** | MIT | ~200 | ~0 | Unknown | Yes | Yes | No | Yes (b/c/blur/sat) | No | No | Yes | Low (last release 1 yr ago) |
| **sharp** (server-side) | Apache-2.0 | 29k+ | 5M+ | N/A (Node native) | Yes | Yes | Yes | Yes | No | N/A | Yes | Active |

---

## Detailed Analysis

### 1. react-filerobot-image-editor (Scaleflex) -- CURRENT CHOICE

- **Repo:** https://github.com/scaleflex/filerobot-image-editor
- **License:** MIT
- **npm:** `react-filerobot-image-editor` (18,475/wk), `filerobot-image-editor` (3,472/wk)
- **GitHub Stars:** ~1,800
- **Last publish:** react wrapper v5.0.0-beta.156 published ~2 months ago; core v4.8.1 published ~2 years ago
- **Bundle Size:** CDN build is 938 kB minified (~280 kB gzip). This is the **heaviest** option.
- **Features:** Full-featured -- crop, rotate, resize, flip, finetune (brightness/contrast/saturation/etc), filters (20+), annotations (text, shapes, pen, arrow, line), watermark, undo/redo/reset
- **React Support:** First-class React component with TypeScript types
- **Pros:**
  - Most feature-complete OSS option by far
  - Full annotation suite (text, shapes, pen, arrows, lines)
  - Built-in filters (Instagram-style)
  - Watermark support
  - Good UI out of the box
  - Active development on React wrapper (beta releases)
- **Cons:**
  - Very large bundle size (938 kB min / ~280 kB gzip)
  - Open GitHub issue #467 about bundle size with no resolution
  - Still in beta (v5.0.0-beta.156) for React wrapper
  - Relatively low adoption (18k/wk downloads)
  - Scaleflex is a commercial company -- risk of license change or abandonment

### 2. Cropper.js v2 / react-cropper

- **Repo:** https://github.com/fengyuanchen/cropperjs (core), https://github.com/react-cropper/react-cropper (React)
- **License:** MIT
- **npm:** cropperjs (1,423,572/wk), react-cropper (395,567/wk)
- **GitHub Stars:** 13,619
- **Last publish:** cropperjs v2.1.1 published 18 days ago
- **Bundle Size:** 12.2 kB gzip (41.6 kB minified) for cropperjs v2
- **Features:** Crop (free/aspect ratio), rotate, flip, zoom, scale. v2 rebuilt with custom elements.
- **React Support:** react-cropper wraps v1.x. For v2, manual integration needed (custom elements).
- **Pros:**
  - Most popular cropper library (1.4M+ weekly downloads)
  - Very small bundle (12 kB gzip)
  - Actively maintained, v2 is modern architecture
  - Battle-tested, huge community
- **Cons:**
  - Crop-only -- no filters, annotations, resize UI, or image adjustments
  - react-cropper wrapper still targets v1; v2 requires custom integration
  - No undo/redo built in
  - Would need to build all non-crop features yourself

### 3. react-image-crop

- **Repo:** https://github.com/DominicTobias/react-image-crop
- **License:** ISC (MIT-compatible, permissive)
- **npm:** 1,648,405/wk
- **GitHub Stars:** ~4,100
- **Last publish:** v11.0.10, about 1 year ago
- **Bundle Size:** <5 kB gzip, zero dependencies
- **Features:** Crop only (free-form or aspect ratio, responsive, touch-enabled, keyboard accessible)
- **React Support:** Native React component, well-designed API
- **Pros:**
  - Smallest bundle (<5 kB gzip)
  - Zero dependencies
  - Very popular (1.65M weekly downloads)
  - Touch-enabled, keyboard accessible
  - ISC license (MIT-compatible)
- **Cons:**
  - **Crop only** -- no rotate, resize, flip, filters, or annotations
  - Maintenance appears slow (last publish 1 year ago)
  - Cannot fulfill the minimum requirement set (no rotate, no resize)

### 4. react-easy-crop

- **Repo:** https://github.com/ValentinH/react-easy-crop
- **License:** MIT
- **npm:** 1,775,377/wk
- **GitHub Stars:** 2,713
- **Last publish:** v5.5.7, about 1 month ago
- **Bundle Size:** 6.9 kB gzip (23.4 kB minified), 1 dependency (normalize-wheel)
- **Features:** Crop (free/aspect ratio), rotation, zoom, supports images and video
- **React Support:** Native React component, excellent API design, hooks-based
- **Pros:**
  - Most downloaded crop library (1.78M/wk)
  - Tiny bundle (6.9 kB gzip)
  - Actively maintained
  - Supports video cropping too
  - Excellent UX (gesture/touch support, Unsplash/Google Photos-like feel)
  - Rotation support built-in
- **Cons:**
  - No resize, filters, annotations, or undo/redo
  - Crop + rotate only -- missing required "resize" feature
  - You produce the final cropped image yourself (provides crop area coordinates)

### 5. tui-image-editor (Toast UI)

- **Repo:** https://github.com/nhn/tui.image-editor
- **License:** MIT
- **npm:** 27,031/wk
- **GitHub Stars:** 7,346
- **Last publish:** v3.15.3, **4 years ago** (circa 2022)
- **Bundle Size:** ~500 kB+ (depends on fabric.js v4)
- **Features:** Full-featured -- crop, rotate, resize, flip, filters (20+), drawing, shapes, text, icons, undo/redo
- **React Support:** @toast-ui/react-image-editor wrapper (also unmaintained)
- **Pros:**
  - Feature-rich (annotations, shapes, text, icons, drawing)
  - Good filter set
  - Undo/redo built-in
  - Large community (7.3k stars)
- **Cons:**
  - **Effectively dead** -- no releases in 4 years, no commit activity
  - Depends on fabric.js v4 (outdated, fabric.js is now at v6)
  - React wrapper is also abandoned
  - Large bundle due to fabric.js dependency (~500 kB+)
  - Known compatibility issues with modern React (18/19)
  - **Cannot recommend for new projects**

### 6. Pintura (formerly Doka)

- **Repo:** Proprietary (pqina.nl/pintura)
- **License:** **PROPRIETARY/COMMERCIAL** -- $13-317/month subscription
- **Features:** Crop, rotate, resize, flip, filters, annotations, stickers, color adjustments, finetune, redact, frame, undo/redo
- **Bundle Size:** ~150 kB gzip (lean for its feature set)
- **React Support:** First-class React wrapper, excellent integration
- **Pros:**
  - Best feature set and UX of any option
  - Small bundle for features offered
  - Excellent documentation and support
  - Cross-framework (React, Vue, Svelte, Angular, vanilla)
- **Cons:**
  - **DISQUALIFIED** -- proprietary license, not MIT/Apache-2.0
  - Recurring subscription cost ($13-317/mo)
  - Cannot redistribute source code
  - Vendor lock-in risk

### 7. react-avatar-editor

- **Repo:** https://github.com/mosch/react-avatar-editor
- **License:** MIT
- **npm:** 537,753/wk
- **GitHub Stars:** ~2,500
- **Last publish:** v15.1.0, about 1 month ago
- **Bundle Size:** ~10 kB gzip (estimated)
- **Features:** Crop (circular/square), rotate, zoom/scale
- **React Support:** Native React component
- **Pros:**
  - Popular (538k/wk), well-maintained
  - Small bundle
  - Clean, focused API
  - Good for avatar/profile picture use case
- **Cons:**
  - **Avatar-focused only** -- circular/square crop with scale
  - No resize to specific dimensions, no filters, no annotations
  - No undo/redo
  - Too limited for a general-purpose image editor

### 8. sharp (Server-Side Reference)

- **Repo:** https://github.com/lovell/sharp
- **License:** Apache-2.0
- **npm:** 5M+/wk
- **GitHub Stars:** 29k+
- **Features:** Crop, rotate, resize, flip, blur, sharpen, format conversion, composite
- **Note:** Node.js native module (libvips), not browser-compatible. Useful for server-side post-processing after client-side editing.

### 9. Newer / Emerging Libraries (2024-2026)

#### react-advanced-cropper
- **Repo:** https://github.com/advanced-cropper/react-advanced-cropper
- **License:** MIT
- **npm:** ~50k/wk
- **Features:** Crop, rotate, resize, flip, zoom, extremely customizable appearance
- **Status:** v0.20.1, last publish ~1 year ago
- **Verdict:** Good customization, but crop-focused. No filters/annotations.

#### react-photo-editor
- **Repo:** https://github.com/musama619/react-photo-editor
- **License:** MIT
- **npm:** <1k/wk (very low adoption)
- **Features:** Brightness, contrast, saturation, grayscale, rotate, flip, draw, zoom, pan
- **Status:** Newer, still early stage
- **Verdict:** Interesting feature set but immature, no crop, very low adoption.

#### ente-io/photo-editor-sdk
- **Repo:** https://github.com/ente-io/photo-editor-sdk
- **License:** MIT
- **npm:** ~0/wk (essentially unused externally)
- **Features:** Transform (aspect ratio, rotate, flip), color adjustments (brightness, contrast, blur, saturation, invert)
- **Status:** Released by Ente (encrypted photo storage), last update ~1 year ago
- **Verdict:** Interesting but essentially zero external adoption. Not production-ready for external use.

#### Konva / react-konva (DIY approach)
- **Repo:** https://github.com/konvajs/konva
- **License:** MIT
- **npm:** Konva ~800k/wk
- **GitHub Stars:** 11k+
- **Features:** Canvas framework -- you build everything yourself (crop, rotate, resize, filters, annotations, text, shapes)
- **Status:** Actively maintained
- **Verdict:** Maximum flexibility but maximum development effort. Not an image editor -- it's a canvas framework you'd use to BUILD one.

---

## Decision Matrix

### Requirements Met

| Requirement | filerobot | cropper.js | react-image-crop | react-easy-crop | tui-image-editor | react-avatar-editor |
|-------------|-----------|------------|-------------------|-----------------|------------------|---------------------|
| MIT/Apache License | Yes | Yes | ISC (compat) | Yes | Yes | Yes |
| Crop | Yes | Yes | Yes | Yes | Yes | Yes |
| Rotate | Yes | Yes | No | Yes | Yes | Yes |
| Resize | Yes | Partial | No | No | Yes | No |
| Filters | Yes | No | No | No | Yes | No |
| Annotations | Yes | No | No | No | Yes | No |
| Undo/Redo | Yes | No | No | No | Yes | No |
| Flip | Yes | Yes | No | No | Yes | No |
| Brightness/Contrast | Yes | No | No | No | Yes | No |
| Actively Maintained | Yes (beta) | Yes | Slow | Yes | **Dead** | Yes |
| Small Bundle | No (938kB) | Yes (12kB) | Yes (<5kB) | Yes (7kB) | No (~500kB) | Yes (~10kB) |

### Scoring (1-5 scale)

| Criteria (Weight) | filerobot | cropper.js | react-easy-crop | tui-image-editor |
|--------------------|-----------|------------|-----------------|------------------|
| Features (30%) | 5 | 2 | 2 | 5 |
| Bundle Size (15%) | 1 | 5 | 5 | 2 |
| Maintenance (20%) | 3 | 5 | 5 | 1 |
| React Quality (15%) | 4 | 3 | 5 | 2 |
| Community/Adoption (10%) | 2 | 5 | 5 | 3 |
| Documentation (10%) | 4 | 4 | 4 | 3 |
| **Weighted Score** | **3.15** | **3.70** | **3.85** | **2.65** |

---

## Recommendation

### For a file uploader needing crop + rotate + resize (minimum):

**Tier 1 -- Best Overall: `react-filerobot-image-editor`** (current choice is correct)
- The ONLY MIT-licensed library that provides all required features (crop, rotate, resize) PLUS full editing (filters, annotations, undo/redo) in a single package
- Bundle size is a real concern (938 kB) but acceptable if lazy-loaded (only loads when user clicks "edit")
- Mitigation: dynamic import / React.lazy() to avoid impacting initial load

**Tier 2 -- Lightweight Alternative: `react-easy-crop` + custom resize dialog**
- Use react-easy-crop for crop/rotate (7 kB gzip)
- Add a simple resize dimension input yourself
- Total bundle ~10 kB but no filters/annotations
- Best if you want minimal editing and tiny bundle

**Tier 3 -- Maximum Control: `Cropper.js v2` + custom UI**
- Most popular, smallest, most maintained
- But requires building your own React integration for v2
- And building all resize/filter/annotation UI yourself

### Disqualified:
- **Pintura** -- proprietary license (not MIT/Apache)
- **tui-image-editor** -- dead project, last release 4 years ago
- **IMG.LY CE.SDK** -- commercial/enterprise pricing
- **react-image-crop** -- missing rotate and resize (fails minimum requirements)
- **react-avatar-editor** -- avatar-only, too limited

### Conclusion:
**Stick with `react-filerobot-image-editor`**. It is the only viable MIT-licensed library that provides a complete image editing experience. The bundle size concern should be mitigated via lazy loading (dynamic import when user clicks edit). No other OSS library comes close to matching its feature set.
