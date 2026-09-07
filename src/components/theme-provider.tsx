import * as React from "react"

export type Theme = "dark" | "light" | "system"
export type ResolvedTheme = "dark" | "light"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  /** theme 为 "system" 时解析出来的实际模式，永远只会是 light / dark */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const DARK_QUERY = "(prefers-color-scheme: dark)"

const ThemeProviderContext = React.createContext<ThemeProviderState>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
})

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "shadcn-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    // 惰性初始化而不是 useEffect 里再读：避免首帧用默认值渲染、第二帧才切换，
    // 那样刷新页面会闪一下白底（FOUC）。
    if (typeof window === "undefined") return defaultTheme
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme
  })

  const [systemDark, setSystemDark] = React.useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(DARK_QUERY).matches
  })

  // 无条件订阅，而不是只在 theme === "system" 时订阅：
  // systemDark 只是一份「系统当前是什么」的镜像，不参与决定显式选择，
  // 因此常年保鲜是安全的；反过来只在 system 模式订阅的话，
  // 用户 light → 系统切深色 → 再切回 system 时会先读到一份陈旧值。
  React.useEffect(() => {
    const mql = window.matchMedia(DARK_QUERY)
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    setSystemDark(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // 派生而非 state：少一次渲染，也不会在 StrictMode 下抖动。
  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme

  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const value = React.useMemo<ThemeProviderState>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next: Theme) => {
        localStorage.setItem(storageKey, next)
        setThemeState(next)
      },
    }),
    [theme, resolvedTheme, storageKey]
  )

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  return React.useContext(ThemeProviderContext)
}
