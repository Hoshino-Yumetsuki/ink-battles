import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveTheme(theme: Theme) {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({
  children,
  defaultTheme = 'system'
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = window.localStorage.getItem('theme')
    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : defaultTheme
  })

  useEffect(() => {
    const applyTheme = () => {
      document.documentElement.classList.toggle(
        'dark',
        resolveTheme(theme) === 'dark'
      )
    }

    applyTheme()
    window.localStorage.setItem('theme', theme)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
