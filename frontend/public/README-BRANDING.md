# Branding Assets — Replacement Guide

When reskinning this app for a new brand, **replace the file contents** at these
fixed paths. Do **not** rename the files — the branding config and templates
reference them by these names.

## Files to Replace

| File | Purpose | Required Format |
|------|---------|-----------------|
| `logo.jpg` | Primary logo / wordmark (header, loading screens) | ~200×200 px, JPEG |
| `favicon.svg` | Browser-tab favicon | SVG, square aspect ratio |
| `icons/icon-192.png` | PWA home-screen icon | 192 × 192 px, PNG, transparent OK |
| `icons/icon-512.png` | PWA splash / install icon | 512 × 512 px, PNG, transparent OK |
| `icons/icon-512-maskable.png` | PWA maskable icon (Android adaptive) | 512 × 512 px, PNG, **safe-zone** center 80 % |

## What Changes Automatically

After replacing these files and editing `src/config/branding.json` (or setting
`VITE_*` env vars), running `npm run dev` or `npm run build` will propagate the
new name, tagline, colors, and asset references into:

- `index.html` (title, favicon, theme-color, apple-touch-icon)
- `public/manifest.json` (name, icons, colors)
- `public/sw.js` (push-notification fallback text)
- All React components (header, hero sections, modals, share text, etc.)

## No File Renames Needed

The asset file names (`logo.jpg`, `favicon.svg`, `icons/icon-*.png`) are fixed
conventions. Simply drop your new brand's artwork into these paths and the app
picks it up — zero code changes required.
