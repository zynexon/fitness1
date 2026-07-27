/**
 * Branding config — the single import point for all frontend branding.
 *
 * Reads defaults from branding.json and overlays any VITE_* env-var
 * overrides so a deployer can customise name/tagline/colors without
 * editing the committed JSON file.
 */
import defaults from './branding.json'

const env = (key) => import.meta.env[key] || undefined

const branding = {
  ...defaults,
  appName:          env('VITE_APP_NAME')          ?? defaults.appName,
  appNameLower:     env('VITE_APP_NAME_LOWER')    ?? defaults.appNameLower,
  appTagline:       env('VITE_APP_TAGLINE')       ?? defaults.appTagline,
  themeColorHex:    env('VITE_THEME_COLOR')       ?? defaults.themeColorHex,
  backgroundColorHex: env('VITE_BACKGROUND_COLOR') ?? defaults.backgroundColorHex,
  primaryColor:     env('VITE_PRIMARY_COLOR')      ?? defaults.primaryColor,
  accentColor:      env('VITE_ACCENT_COLOR')       ?? defaults.accentColor,
  supportEmail:     env('VITE_SUPPORT_EMAIL')      ?? defaults.supportEmail,
  fromEmail:        env('VITE_FROM_EMAIL')         ?? defaults.fromEmail,
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Simple template interpolation.
 *   interpolate("Hello {name}", { name: "World" }) → "Hello World"
 */
export function interpolate(template, vars = {}) {
  if (!template) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : `{${key}}`))
}

/**
 * Return the level-title for a given level number.
 * Falls back to the first entry ("Civilian") for unknown levels.
 */
export function getLevelTitle(level) {
  const titles = branding.copyPack.levelTitles
  if (level >= 30) return titles['30'] || branding.appName
  return titles[String(level)] || titles['1'] || 'Civilian'
}

export default branding
