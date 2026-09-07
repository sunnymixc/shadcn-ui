// 可编辑的主题令牌清单 + 出厂默认值。
//
// tsconfig 开了 erasableSyntaxOnly，所以这里用 as const 数组 + 派生类型，
// 不能用 enum。

export const TOKEN_GROUPS = [
  "表面",
  "交互",
  "语义",
  "边框",
  "图表",
] as const

export type TokenGroup = (typeof TOKEN_GROUPS)[number]

export const COLOR_TOKENS = [
  { key: "background", label: "页面背景", group: "表面", used: true },
  { key: "foreground", label: "页面文字", group: "表面", used: true },
  { key: "card", label: "卡片背景", group: "表面", used: true },
  { key: "card-foreground", label: "卡片文字", group: "表面", used: true },
  { key: "popover", label: "浮层背景", group: "表面", used: true },
  { key: "popover-foreground", label: "浮层文字", group: "表面", used: true },

  { key: "primary", label: "主色", group: "交互", used: true },
  { key: "primary-foreground", label: "主色上的文字", group: "交互", used: true },
  { key: "secondary", label: "次要色", group: "交互", used: true },
  { key: "secondary-foreground", label: "次要色上的文字", group: "交互", used: true },
  { key: "accent", label: "强调色（悬停底色）", group: "交互", used: true },
  { key: "accent-foreground", label: "强调色上的文字", group: "交互", used: true },
  { key: "muted", label: "弱化背景", group: "交互", used: true },
  { key: "muted-foreground", label: "弱化文字", group: "交互", used: true },

  { key: "destructive", label: "危险色", group: "语义", used: true },
  // Button 的 destructive variant 用的是 text-white 而不是这个令牌，
  // 新版 shadcn 已经把它移除了；本仓库还留着但没有任何组件消费。
  { key: "destructive-foreground", label: "危险色上的文字", group: "语义", used: false },

  { key: "border", label: "边框", group: "边框", used: true },
  { key: "input", label: "输入框边框", group: "边框", used: true },
  { key: "ring", label: "焦点环", group: "边框", used: true },

  // 本项目没有图表组件，这 5 个令牌拖了滑杆页面不会有反应，
  // 所以 theme.tsx 的预览区专门放了色卡把它们「用起来」。
  { key: "chart-1", label: "图表色 1", group: "图表", used: false },
  { key: "chart-2", label: "图表色 2", group: "图表", used: false },
  { key: "chart-3", label: "图表色 3", group: "图表", used: false },
  { key: "chart-4", label: "图表色 4", group: "图表", used: false },
  { key: "chart-5", label: "图表色 5", group: "图表", used: false },
] as const satisfies readonly {
  key: string
  label: string
  group: TokenGroup
  used: boolean
}[]

export type ColorToken = (typeof COLOR_TOKENS)[number]["key"]

export type TokenOverrides = Partial<Record<ColorToken, string>>

const TOKEN_KEYS = new Set<string>(COLOR_TOKENS.map((t) => t.key))

export function isColorToken(key: string): key is ColorToken {
  return TOKEN_KEYS.has(key)
}

// ⚠️ 与 src/index.css 的 :root / .dark 手工同步。
//
// 为什么必须抄一份而不是运行时读：getComputedStyle 只能拿到「当前模式」的值，
// 浅色下读不到 .dark 的 --primary。
//
// 万一漂移了后果也可控 —— 运行时注入的是稀疏覆盖（只输出用户真正改过的项），
// 这份 DEFAULTS 只服务于滑杆初值、单项重置和导出，不参与实际渲染。
export const DEFAULT_RADIUS = "0.625rem"

/** 主题令牌只有明暗两套，与 ThemeProvider 的 resolvedTheme 取值一致 */
export type ThemeMode = "light" | "dark"

export const DEFAULTS: Record<ThemeMode, Record<ColorToken, string>> = {
  light: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    primary: "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    "destructive-foreground": "oklch(0.985 0 0)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.708 0 0)",
    "chart-1": "oklch(0.646 0.222 41.116)",
    "chart-2": "oklch(0.6 0.118 184.704)",
    "chart-3": "oklch(0.398 0.07 227.392)",
    "chart-4": "oklch(0.828 0.189 84.429)",
    "chart-5": "oklch(0.769 0.188 70.08)",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.269 0 0)",
    "popover-foreground": "oklch(0.985 0 0)",
    primary: "oklch(0.922 0 0)",
    "primary-foreground": "oklch(0.205 0 0)",
    secondary: "oklch(0.269 0 0)",
    "secondary-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    "muted-foreground": "oklch(0.708 0 0)",
    accent: "oklch(0.371 0 0)",
    "accent-foreground": "oklch(0.985 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
    "destructive-foreground": "oklch(0.985 0 0)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: "oklch(0.556 0 0)",
    "chart-1": "oklch(0.488 0.243 264.376)",
    "chart-2": "oklch(0.696 0.17 162.48)",
    "chart-3": "oklch(0.769 0.188 70.08)",
    "chart-4": "oklch(0.627 0.265 303.9)",
    "chart-5": "oklch(0.645 0.246 16.439)",
  },
}
