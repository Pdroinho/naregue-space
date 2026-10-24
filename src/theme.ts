import type { TenantPublic } from './types'

export type AppMode = 'public' | 'tenant' | 'admin' | 'dev'

export type ThemeMode = 'light' | 'dark'

export type DevThemeMode = ThemeMode

function syncBrowserTheme(theme: ThemeMode, primaryColor?: string) {
  const root = document.documentElement
  root.style.colorScheme = theme
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = theme === 'dark' ? '#031722' : (primaryColor ?? '#d9743c')
}

export function initTheme() {
  const root = document.documentElement
  const savedTheme = (() => {
    try {
      const value = window.localStorage.getItem('theme')
      return value === 'dark' || value === 'light' ? value : null
    } catch {
      return null
    }
  })()
  const theme: ThemeMode = savedTheme ?? 'light'
  root.dataset.theme = theme
  syncBrowserTheme(theme)
}

export function getTheme(): ThemeMode {
  const v = document.documentElement.dataset.theme
  return v === 'dark' ? 'dark' : 'light'
}

export function setTheme(theme: ThemeMode) {
  const root = document.documentElement
  root.dataset.theme = theme
  const currentPrimary = root.style.getPropertyValue('--primary').trim() || undefined
  syncBrowserTheme(theme, currentPrimary)
  try {
    window.localStorage.setItem('theme', theme)
  } catch {
    void 0
  }
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

export function initDevTheme(defaultTheme: DevThemeMode = 'light') {
  const root = document.documentElement
  const fromStorage = (() => {
    try {
      const v = window.localStorage.getItem('devTheme')
      if (v === 'light' || v === 'dark') return v
      return null
    } catch {
      return null
    }
  })()

  root.dataset.devTheme = fromStorage ?? defaultTheme
  syncBrowserTheme(root.dataset.devTheme === 'dark' ? 'dark' : 'light', getDevPrimaryColor() ?? undefined)

  const color = getDevPrimaryColor()
  if (color) applyPrimaryColor(color)
}

export function getDevTheme(): DevThemeMode {
  const v = document.documentElement.dataset.devTheme
  return v === 'dark' ? 'dark' : 'light'
}

export function getDevPrimaryColor(): string | null {
  try {
    return window.localStorage.getItem('devPrimaryColor')
  } catch {
    return null
  }
}

export function setDevPrimaryColor(color: string) {
  try {
    window.localStorage.setItem('devPrimaryColor', color)
    applyPrimaryColor(color)
  } catch {
    void 0
  }
}

export function setDevTheme(theme: DevThemeMode) {
  document.documentElement.dataset.devTheme = theme
  syncBrowserTheme(theme, getDevPrimaryColor() ?? undefined)
  try {
    window.localStorage.setItem('devTheme', theme)
  } catch {
    void 0
  }
}

export function toggleDevTheme(): DevThemeMode {
  const next: DevThemeMode = getDevTheme() === 'dark' ? 'light' : 'dark'
  setDevTheme(next)
  return next
}

export function clearTenantTheme() {
  const root = document.documentElement
  const activeTheme: ThemeMode = root.dataset.mode === 'dev'
    ? (root.dataset.devTheme === 'dark' ? 'dark' : 'light')
    : getTheme()
  syncBrowserTheme(activeTheme)
  for (const key of [
    '--primary',
    '--primary-rgb',
    '--primary-fg',
    '--primaryText',
    '--primary-50',
    '--primary-100',
    '--primary-200',
    '--primary-300',
    '--primary-400',
    '--primary-500',
    '--primary-600',
    '--primary-700',
    '--primary-800',
    '--primary-900',
    '--primary-900-rgb',
    '--accent2',
    '--accent3',
    '--primary-on-light',
    '--primary-on-dark',
    '--primary-on-dark-soft',
    '--ring',
  ]) {
    root.style.removeProperty(key)
  }
}

export function setAppMode(mode: AppMode) {
  const root = document.documentElement
  root.dataset.mode = mode
  if (mode === 'public') clearTenantTheme()
  if (mode === 'dev') {
     const c = getDevPrimaryColor()
     if (c) applyPrimaryColor(c)
     else clearTenantTheme()
  }
}

export function applyPrimaryColor(hexColor: string) {
  const root = document.documentElement
  
  const normalizeHex = (hex: string) => {
    const h = hex.trim().replace('#', '')
    if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`
    if (h.length === 6) return `#${h}`
    return '#d7784a'
  }

  const hexToRgb = (hex: string) => {
    const n = normalizeHex(hex).slice(1)
    const r = parseInt(n.slice(0, 2), 16)
    const g = parseInt(n.slice(2, 4), 16)
    const b = parseInt(n.slice(4, 6), 16)
    return { r, g, b }
  }

  const mix = (a: string, b: string, t: number) => {
    const c1 = hexToRgb(a)
    const c2 = hexToRgb(b)
    const r = Math.round(c1.r * (1 - t) + c2.r * t)
    const g = Math.round(c1.g * (1 - t) + c2.g * t)
    const b2 = Math.round(c1.b * (1 - t) + c2.b * t)
    const toHex = (v: number) => v.toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b2)}`
  }

  const srgbToLinear = (v: number) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }

  const luminance = (hex: string) => {
    const { r, g, b } = hexToRgb(hex)
    const rl = srgbToLinear(r)
    const gl = srgbToLinear(g)
    const bl = srgbToLinear(b)
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
  }

  const contrastRatio = (a: string, b: string) => {
    const aLuminance = luminance(a)
    const bLuminance = luminance(b)
    return (Math.max(aLuminance, bLuminance) + 0.05) / (Math.min(aLuminance, bLuminance) + 0.05)
  }

  const readableTone = (color: string, background: string, minimum = 4.5) => {
    const normalized = normalizeHex(color)
    if (contrastRatio(normalized, background) >= minimum) return normalized

    const target = contrastRatio('#fffdf8', background) >= contrastRatio('#071014', background)
      ? '#fffdf8'
      : '#071014'
    let low = 0
    let high = 1
    for (let index = 0; index < 14; index += 1) {
      const amount = (low + high) / 2
      if (contrastRatio(mix(normalized, target, amount), background) >= minimum) high = amount
      else low = amount
    }
    return mix(normalized, target, high)
  }

  const primary = normalizeHex(hexColor)
  const primaryRgb = hexToRgb(primary)
  const primaryRgbStr = `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`

  const primary50 = mix(primary, '#ffffff', 0.92)
  const primary100 = mix(primary, '#ffffff', 0.84)
  const primary200 = mix(primary, '#ffffff', 0.72)
  const primary300 = mix(primary, '#ffffff', 0.56)
  const primary400 = mix(primary, '#ffffff', 0.38)
  const primary600Base = mix(primary, '#000000', 0.12)
  const primary700Base = mix(primary, '#000000', 0.24)
  const primary800 = mix(primary, '#000000', 0.36)
  const primary900 = mix(primary, '#000000', 0.5)

  const darkForeground = '#071014'
  const lightForeground = '#fffdf8'
  const primaryText = contrastRatio(darkForeground, primary600Base) >= contrastRatio(lightForeground, primary600Base)
    ? darkForeground
    : lightForeground
  const primary600 = readableTone(primary600Base, primaryText)
  const primary700 = readableTone(primary700Base, primaryText)
  const primaryOnLight = readableTone(primary700Base, '#f4efe6', 5)
  const primaryOnDark = readableTone(primary, '#021119', 5)
  const primaryOnDarkSoft = readableTone(primary, '#021119', 3)

  const primary900Rgb = hexToRgb(primary900)
  const primary900RgbStr = `${primary900Rgb.r}, ${primary900Rgb.g}, ${primary900Rgb.b}`

  root.style.setProperty('--primary', primary)
  const activeTheme: ThemeMode = root.dataset.mode === 'dev'
    ? (root.dataset.devTheme === 'dark' ? 'dark' : 'light')
    : getTheme()
  syncBrowserTheme(activeTheme, primary)
  root.style.setProperty('--primary-rgb', primaryRgbStr)
  root.style.setProperty('--primary-fg', primaryText)
  root.style.setProperty('--primaryText', primaryText)
  root.style.setProperty('--primary-50', primary50)
  root.style.setProperty('--primary-100', primary100)
  root.style.setProperty('--primary-200', primary200)
  root.style.setProperty('--primary-300', primary300)
  root.style.setProperty('--primary-400', primary400)
  root.style.setProperty('--primary-500', primary)
  root.style.setProperty('--primary-600', primary600)
  root.style.setProperty('--primary-700', primary700)
  root.style.setProperty('--primary-800', primary800)
  root.style.setProperty('--primary-900', primary900)
  root.style.setProperty('--primary-900-rgb', primary900RgbStr)
  root.style.setProperty('--accent2', mix(primary, '#f2e8d6', 0.55))
  root.style.setProperty('--accent3', mix(primary, '#0b2a3a', 0.55))
  root.style.setProperty('--primary-on-light', primaryOnLight)
  root.style.setProperty('--primary-on-dark', primaryOnDark)
  root.style.setProperty('--primary-on-dark-soft', primaryOnDarkSoft)
  root.style.setProperty('--ring', mix(primary, '#ffffff', 0.25))
}

export function applyTenantTheme(tenant: TenantPublic | null) {
  if (!tenant) return
  applyPrimaryColor(tenant.primaryColor)
}
