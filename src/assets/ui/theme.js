/* global localStorage */
export const colorSchemes = {
  Amber: {
    // This will load pico.amber.min.css
    light: { 'primary-rgb': '255, 193, 7' },
    dark: { 'primary-rgb': '255, 202, 44' }
  },
  Blue: {
    // This will load pico.blue.min.css
    light: { 'primary-rgb': '0, 123, 255' },
    dark: { 'primary-rgb': '55, 125, 255' }
  },
  Cyan: {
    // This will load pico.cyan.min.css
    light: { 'primary-rgb': '23, 162, 184' },
    dark: { 'primary-rgb': '79, 195, 214' }
  },
  Default: {
    // This will load pico.min.css
    light: { 'primary-rgb': '29, 136, 254' },
    dark: { 'primary-rgb': '82, 157, 255' }
  },
  Fuchsia: {
    // This will load pico.fuchsia.min.css
    light: { 'primary-rgb': '255, 0, 255' },
    dark: { 'primary-rgb': '255, 102, 255' }
  },
  Grey: {
    // This will load pico.grey.min.css
    light: { 'primary-rgb': '115, 130, 144' },
    dark: { 'primary-rgb': '161, 172, 184' }
  },
  Green: {
    // This will load pico.green.min.css
    light: { 'primary-rgb': '56, 142, 60' },
    dark: { 'primary-rgb': '102, 187, 106' }
  },
  Indigo: {
    // This will load pico.indigo.min.css
    light: { 'primary-rgb': '102, 16, 242' },
    dark: { 'primary-rgb': '154, 104, 247' }
  },
  Jade: {
    // This will load pico.jade.min.css
    light: { 'primary-rgb': '0, 168, 107' },
    dark: { 'primary-rgb': '0, 200, 130' }
  },
  Lime: {
    // This will load pico.lime.min.css
    light: { 'primary-rgb': '205, 220, 57' },
    dark: { 'primary-rgb': '220, 231, 117' }
  },
  Orange: {
    // This will load pico.orange.min.css
    light: { 'primary-rgb': '255, 152, 0' },
    dark: { 'primary-rgb': '255, 183, 77' }
  },
  Pink: {
    // This will load pico.pink.min.css
    light: { 'primary-rgb': '233, 30, 99' },
    dark: { 'primary-rgb': '244, 143, 177' }
  },
  Pumpkin: {
    // This will load pico.pumpkin.min.css
    light: { 'primary-rgb': '255, 112, 0' },
    dark: { 'primary-rgb': '255, 144, 51' }
  },
  Purple: {
    // This will load pico.purple.min.css
    light: { 'primary-rgb': '156, 39, 176' },
    dark: { 'primary-rgb': '186, 104, 200' }
  },
  Red: {
    // This will load pico.red.min.css
    light: { 'primary-rgb': '211, 47, 47' },
    dark: { 'primary-rgb': '255, 82, 82' }
  },
  Sand: {
    // This will load pico.sand.min.css
    light: { 'primary-rgb': '215, 194, 169' },
    dark: { 'primary-rgb': '227, 211, 189' }
  },
  Slate: {
    // This will load pico.slate.min.css
    light: { 'primary-rgb': '82, 105, 129' },
    dark: { 'primary-rgb': '132, 151, 171' }
  },
  Violet: {
    // This will load pico.violet.min.css
    light: { 'primary-rgb': '126, 87, 194' },
    dark: { 'primary-rgb': '179, 157, 219' }
  },
  Yellow: {
    // This will load pico.yellow.min.css
    light: { 'primary-rgb': '255, 235, 59' },
    dark: { 'primary-rgb': '255, 241, 118' }
  },
  Zinc: {
    // This will load pico.zinc.min.css
    light: { 'primary-rgb': '112, 112, 112' },
    dark: { 'primary-rgb': '144, 144, 144' }
  }
}

/**
 * Applies the given color scheme to the document.
 * @param {string} schemeName The name of the scheme to apply (e.g., 'Pico', 'Green').
 */
export function applyColorScheme (schemeName) {
  // schemeName will be 'Default', 'Amber', 'Cyan', etc.
  const scheme = colorSchemes[schemeName] || colorSchemes.Default
  if (!scheme) {
    console.warn(`Color scheme "${schemeName}" not found.`)
    return
  }

  const picoThemeLink = document.querySelector(
    'link[href*="pico.min.css"], link[href*="pico."][href*=".min.css"]'
  )
  if (!picoThemeLink) {
    console.error('Pico.css link element not found!')
    return
  }

  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light'
  const colors = scheme[currentTheme]

  // Update the Pico.css stylesheet link
  const picoCssFileName =
    schemeName === 'Default'
      ? 'pico.min.css'
      : `pico.${schemeName.toLowerCase()}.min.css`
  picoThemeLink.href = `https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/${picoCssFileName}`

  // Set the --primary-rgb variable for custom ToCry styles
  document.documentElement.style.setProperty(
    '--primary-rgb',
    colors['primary-rgb']
  )

  // Update the color swatch next to the selector
  const currentColorSwatch = document.getElementById('current-color-swatch')
  if (currentColorSwatch) {
    // Use the primary-rgb from the *light* theme of the selected scheme for the swatch,
    // as the swatch itself represents the color scheme's primary color, not the current app theme.
    const lightThemePrimaryRgb = colorSchemes[schemeName].light['primary-rgb']
    currentColorSwatch.style.backgroundColor = `rgb(${lightThemePrimaryRgb})`
  }
}

/**
 * Applies the given theme to the document and updates the switcher button.
 * @param {string} theme The theme to apply ('light' or 'dark').
 */
export function applyTheme (theme) {
  document.documentElement.setAttribute('data-theme', theme)
  const themeSwitcher = document.getElementById('theme-switcher')
  if (themeSwitcher) {
    if (theme === 'dark') {
      themeSwitcher.textContent = '☀️' // Sun icon for switching to light
      themeSwitcher.setAttribute('aria-label', 'Switch to light theme')
    } else {
      themeSwitcher.textContent = '🌙' // Moon icon for switching to dark
      themeSwitcher.setAttribute('aria-label', 'Switch to dark theme')
    }
  }

  // Re-apply the current color scheme to get the correct light/dark variants
  const colorSchemeSwitcher = document.getElementById('color-scheme-switcher')
  if (colorSchemeSwitcher && colorSchemeSwitcher.value) {
    applyColorScheme(colorSchemeSwitcher.value)
  }

  // Toggle highlight.js theme stylesheets for rendered notes
  const darkHljsTheme = document.getElementById('hljs-dark-theme')
  const lightHljsTheme = document.getElementById('hljs-light-theme')
  if (darkHljsTheme && lightHljsTheme) {
    if (theme === 'dark') {
      darkHljsTheme.disabled = false
      lightHljsTheme.disabled = true
    } else {
      darkHljsTheme.disabled = true
      lightHljsTheme.disabled = false
    }
  }
}

export function handleThemeSwitch () {
  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light'
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
  localStorage.setItem('theme', newTheme)
  applyTheme(newTheme)
}
