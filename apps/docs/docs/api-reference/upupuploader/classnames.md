---
sidebar_position: 7
---

# Theme Slots

The stable styling API is `theme.slots`.

```tsx
<UpupUploader
  theme={{
    mode: 'system',
    slots: {
      root: 'rounded-lg border',
      uploadButton: 'bg-black text-white',
    },
  }}
/>
```

Use `theme.mode` for color scheme:

```tsx
<UpupUploader theme={{ mode: 'dark' }} />
```

Slot contracts are exported from `@upup/core/theme`.
