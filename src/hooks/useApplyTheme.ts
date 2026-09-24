import { useEffect } from 'react'
import type { Theme } from '../types/domain'

/** `theme` 'system' ise data-theme kaldırılır, tokens.css prefers-color-scheme'e döner. */
export function useApplyTheme(theme: Theme) {
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme])
}
