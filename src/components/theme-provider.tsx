import * as React from "react"

export type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = React.createContext<ThemeProviderState>({
  theme: "system",
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

  React.useEffect(() => {
    const root = window.document.documentElement

    const apply = () => {
      root.classList.remove("light", "dark")
      const resolved =
        theme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : theme
      root.classList.add(resolved)
    }

    apply()

    if (theme !== "system") return

    // 只有 system 模式才需要跟随系统变化；显式选了 light/dark 时监听是多余的，
    // 而且会在用户切换系统外观时错误地覆盖他的显式选择。
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    mql.addEventListener("change", apply)
    return () => mql.removeEventListener("change", apply)
  }, [theme])

  const value = React.useMemo<ThemeProviderState>(
    () => ({
      theme,
      setTheme: (next: Theme) => {
        localStorage.setItem(storageKey, next)
        setThemeState(next)
      },
    }),
    [theme, storageKey]
  )

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error("useTheme 必须在 ThemeProvider 内部使用")
  }
  return context
}
