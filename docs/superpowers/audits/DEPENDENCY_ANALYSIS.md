# Dependency Analysis: 31 Missing + 14 Partial Features

## Executive Summary

- **31 missing** + **14 partial** features (45 total work items)
- **5 independent subsystems** can be implemented in parallel
- **Critical path:** Theme tokens → Components (70→71→73→69)
- **Package structure intact:** shared/core/react/server with correct graph

---

## 1. MANDATORY DEPENDENCY CHAINS

### Chain A: Theme Subsystem (6 features)
```
70 (Semantic tokens)
├─ 71 (CSS variables)
├─ 72 (Light/dark presets) → 73 (resolveTheme pipeline)
└─ 75 (Component-scoped slots)
   ├─ 76 (Slot recipes via tailwind-variants)
   └─ 78 (data-upup-slot attribute)
└─ 69 (theme prop) [depends on 70 + 75]
```

**Order:** 70 → 72, 71 → 73 → 69 → 75, 76, 77, 78

**Why:** Theme tokens are the foundation. CSS variables and presets depend on token shape.

---

### Chain B: Internationalization Subsystem (12 features)
```
56 (ICU syntax) → 57 (Namespaced) ──┐
59 (BCP 47) ──┬─ 60, 64  ───────────┤
              └─ 61, 62, 63   ─ 65 (Translator)
                                    ├─ 66 (onMissingKey)
                                    ├─ 67 (Pipeline t())
                                    └─ 68 (CoreOptions)
```

**Order:** Start (56,58,59) → (57,60,64) → (65) → (61,62,63,67,68) → (66)

---

### Chain C: Upload Strategy Subsystem (5 features)
```
84 (Custom presigned URL) → 55 (Strategy implementations)
86 (Token revalidation) [independent]
82 (OAuth routes) [independent]
83 (Signed URL service) [independent]
```

---

## 2. INDEPENDENT FEATURES (14 total)

### Shared Package
- 79, 44, 45, 53 — New/reshaped types, no cross-deps

### Core Package
- 80, 81, 49, 50, 51, 52, 54 — API additions, type reshapes, wiring

### React Package
- 77, 85, 46, 47, 48 — Attributes, a11y, API exposure

### Server Package
- 82, 83 — New endpoints

---

## 3. BLOCKING RELATIONSHIPS FOR PARTIALS

| Partial | Blocked By |
|---------|-----------|
| #42 (React translations) | Missing #61, #62, #67 |
| #55 (Strategies) | Missing #84 (presigned URL) |
| All others | Independent |

**Action:** Complete #84 before #55. Complete i18n (Plan 2) before finishing #42.

---

## 4. FIVE RELEASE PLANS

### Plan 1: Theme Foundation (7 features) — *CRITICAL PATH*
**Features:** 70, 71, 72, 73, 69, 75, 77
**Complete Partials:** #46
**Duration:** 2 weeks
**Risk:** Theme design churn
**Launch Blocker:** None (ships independently)

### Plan 2: i18n Infrastructure (10 features) — *Parallel with Plan 1*
**Features:** 56, 57, 58, 59, 60, 64, 65, 66, 67, 68, 61, 62, 63
**Complete Partials:** #42
**Duration:** 3 weeks
**Risk:** Message format complexity
**Launch Blocker:** None (ships independently)

### Plan 3: API & Upload Enhancements (8 features) — *Parallel*
**Features:** 44, 45, 53, 79, 49, 50, 51, 52, 54, 80, 81
**Complete Partials:** #43, #51, #52, #54
**Duration:** 1.5 weeks
**Risk:** Low (pure types/APIs)
**Launch Blocker:** None

### Plan 4: Server & Strategy (5 features) — *Parallel*
**Features:** 84, 55, 82, 83, 86
**Complete Partials:** #55
**Duration:** 2 weeks
**Dependencies:** 84 → 55
**Risk:** OAuth complexity

### Plan 5: React Polish (5 features) — *After Plan 1*
**Features:** 76, 78, 74, 85, 48, 47
**Complete Partials:** #46, #47, #48
**Duration:** 1.5 weeks
**Dependencies:** Requires Plan 1 (theme) for #76, #78, #74
**Risk:** Low

---

## 5. EXECUTION TIMELINE

```
Weeks 1-2:  Plan 1 (Theme) + Plan 3 (API) in parallel
Weeks 2-3:  Plan 2 (i18n) + Plan 4 (Server) in parallel
Week 3+:    Plan 5 (React Polish) [waits for Plan 1]

Total: 3-4 weeks to completion
Parallel: Plans 1,3,4 can overlap; 2 independent; 5 blocked by 1
```

---

## 6. PACKAGE IMPACT SUMMARY

**@upup/shared**
- ADD: Theme token types, semantic values, i18n formatter, locale chain
- NET: +200 LOC (mostly types)

**@upup/core**
- ADD: Real translator in pipeline, validation API, dynamic imports
- MODIFY: CoreOptions typing (i18n)
- NET: +300 LOC

**@upup/react**
- ADD: UpupThemeProvider, slot recipes, theme prop, data attributes
- MODIFY: 22 components (add theme context, slot binding)
- NET: +800 LOC

**@upup/server**
- ADD: OAuth routes, signed URL service
- NET: +250 LOC

