/**
 * generate-branding-files.js
 *
 * Prebuild script that reads branding.json (+ optional env-var overrides)
 * and generates:
 *   - frontend/index.html       (from index.html.template)
 *   - frontend/public/manifest.json  (from public/manifest.template.json)
 *   - frontend/public/sw.js     (from public/sw.js.template)
 *
 * Run via:  node scripts/generate-branding-files.js
 * Wired as  "predev" and "prebuild" in package.json.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── 1. Load branding config ────────────────────────────────────────────────

const branding = JSON.parse(
  readFileSync(resolve(root, 'src/config/branding.json'), 'utf-8'),
)

// Apply env-var overrides (same keys as branding.js uses at runtime)
const envOverrides = {
  appName:          process.env.VITE_APP_NAME,
  appNameLower:     process.env.VITE_APP_NAME_LOWER,
  appTagline:       process.env.VITE_APP_TAGLINE,
  themeColorHex:    process.env.VITE_THEME_COLOR,
  backgroundColorHex: process.env.VITE_BACKGROUND_COLOR,
  primaryColor:     process.env.VITE_PRIMARY_COLOR,
  accentColor:      process.env.VITE_ACCENT_COLOR,
  supportEmail:     process.env.VITE_SUPPORT_EMAIL,
  fromEmail:        process.env.VITE_FROM_EMAIL,
}

for (const [key, val] of Object.entries(envOverrides)) {
  if (val) branding[key] = val
}

// ── 2. Interpolation helper ─────────────────────────────────────────────────

function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key in vars) return vars[key]
    console.warn(`  ⚠ Unknown template variable: {{${key}}}`)
    return `{{${key}}}`
  })
}

// Flat vars object for all templates
const vars = {
  appName:              branding.appName,
  appNameLower:         branding.appNameLower,
  appTagline:           branding.appTagline,
  shortDescription:     branding.shortDescription,
  themeColorHex:        branding.themeColorHex,
  backgroundColorHex:   branding.backgroundColorHex,
  primaryColor:         branding.primaryColor,
  accentColor:          branding.accentColor,
  logoPath:             branding.logoPath,
  faviconPath:          branding.faviconPath,
  icon192Path:          branding.icon192Path,
  icon512Path:          branding.icon512Path,
  icon512MaskablePath:  branding.icon512MaskablePath,
  supportEmail:         branding.supportEmail,
  fromEmail:            branding.fromEmail,
  weeklyReportDefaultBody: 'Your weekly report is ready.',
}

// ── 3. Generate files ───────────────────────────────────────────────────────

const files = [
  {
    template: resolve(root, 'index.html.template'),
    output:   resolve(root, 'index.html'),
    label:    'index.html',
  },
  {
    template: resolve(root, 'public/manifest.template.json'),
    output:   resolve(root, 'public/manifest.json'),
    label:    'public/manifest.json',
  },
  {
    template: resolve(root, 'public/sw.js.template'),
    output:   resolve(root, 'public/sw.js'),
    label:    'public/sw.js',
  },
]

console.log('🎨 Generating branded files...')

for (const { template, output, label } of files) {
  const src = readFileSync(template, 'utf-8')
  const result = interpolate(src, vars)
  writeFileSync(output, result, 'utf-8')
  console.log(`  ✔ ${label}`)
}

console.log('✅ Branding files generated.\n')
