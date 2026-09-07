import * as React from "react"

import { isSafeOklch, isSafeRadius, normalizeOklch } from "@/lib/color"
import type { ThemePreset } from "@/lib/theme-presets"
import {
  COLOR_TOKENS,
  DEFAULT_RADIUS,
  DEFAULTS,
  isColorToken,
} from "@/lib/theme-tokens"
import type { ColorToken, ThemeMode, TokenOverrides } from "@/lib/theme-tokens"

export const THEME_CONFIG_STORAGE_KEY = "shadcn-ui-theme-config"
export const THEME_STYLE_ELEMENT_ID = "theme-overrides"

const CONFIG_VERSION = 1

export type ThemeConfig = {
  v: typeof CONFIG_VERSION
  light: TokenOverrides
  dark: TokenOverrides
  /** --radius 在 index.css 里只定义于 :root、没有 .dark 版本，所以它是全局的，不分模式 */
  radius?: string
}

const EMPTY_CONFIG: ThemeConfig = { v: CONFIG_VERSION, light: {}, dark: {} }

/* -------------------------------------------------------------------------- */
/* 读取与校验                                                                   */
/* -------------------------------------------------------------------------- */

function sanitizeOverrides(raw: unknown): TokenOverrides {
  const out: TokenOverrides = {}
  if (!raw || typeof raw !== "object") return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isColorToken(key)) continue
    if (typeof value !== "string") continue
    // round-trip：解析成功 + 重新序列化后能通过严格正则，才允许进内存
    const normalized = normalizeOklch(value)
    if (normalized) out[key] = normalized
  }
  return out
}

/**
 * localStorage 的内容是用户可以随手改的，这里做三重防御：
 * JSON 解析 → 版本校验 → 逐 key 白名单 + 值校验。
 * 任何一步失败都静默回退到空配置，绝不抛错 —— 它在 useState 惰性初始化里跑，抛了就白屏。
 */
export function readThemeConfig(): ThemeConfig {
  if (typeof window === "undefined") return EMPTY_CONFIG
  try {
    const raw = localStorage.getItem(THEME_CONFIG_STORAGE_KEY)
    if (!raw) return EMPTY_CONFIG

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return EMPTY_CONFIG

    const obj = parsed as Record<string, unknown>
    // 版本不符直接丢弃重置。令牌集合将来一变，这比逐 key 兼容便宜太多。
    if (obj.v !== CONFIG_VERSION) return EMPTY_CONFIG

    const radius =
      typeof obj.radius === "string" && isSafeRadius(obj.radius)
        ? obj.radius
        : undefined

    return {
      v: CONFIG_VERSION,
      light: sanitizeOverrides(obj.light),
      dark: sanitizeOverrides(obj.dark),
      ...(radius ? { radius } : {}),
    }
  } catch {
    return EMPTY_CONFIG
  }
}

/* -------------------------------------------------------------------------- */
/* CSS 生成                                                                     */
/* -------------------------------------------------------------------------- */

function safeEntries(overrides: TokenOverrides): [string, string][] {
  const out: [string, string][] = []
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === "string" && isColorToken(key) && isSafeOklch(value)) {
      out.push([key, value])
    }
  }
  return out
}

function cssBlock(selector: string, entries: [string, string][]): string {
  if (entries.length === 0) return ""
  const body = entries.map(([k, v]) => `  --${k}: ${v};`).join("\n")
  return `${selector} {\n${body}\n}\n`
}

/**
 * 运行时注入用的 CSS。
 *
 * 选择器是整个方案的关键，不能改成朴素的 :root / .dark ——
 * index.css 里那两块是「裸写」的、特异度同为 (0,1,0)，.dark 仅靠写在后面取胜。
 * 我们注入的 <style> 排在 index.css 之后，若也写 :root，就会在深色模式下
 * 反过来压住 .dark，导致用户只改了浅色、深色却跟着变（稀疏覆盖时必现）。
 *
 * html:root:not(.dark) 的特异度是 (0,2,1)：:not() 取参数里最高的 .dark = (0,1,0)，
 * 叠加 :root (0,1,0) 和 html (0,0,1)。稳压 index.css，且与文档顺序无关 ——
 * 这一点很重要，因为 dev 下 Vite 用 <style> 注入、prod 下用 <link>，head 顺序不同。
 * 深色时 :not(.dark) 天然不匹配，泄漏在物理上不可能发生。
 */
export function buildRuntimeCss(config: ThemeConfig): string {
  const radiusBlock =
    config.radius && isSafeRadius(config.radius)
      ? // --radius 必须单独一块。塞进浅色块的话，深色下就没有 radius 覆盖了。
        cssBlock("html:root", [["radius", config.radius]])
      : ""

  return (
    radiusBlock +
    cssBlock("html:root:not(.dark)", safeEntries(config.light)) +
    cssBlock("html:root.dark", safeEntries(config.dark))
  )
}

/**
 * 导出给用户粘回 index.css 的 CSS。
 * 与运行时那套刻意不复用：这里要的是标准 :root / .dark 选择器 + 全量值，
 * 让用户可以整块替换掉 index.css 里对应的两段，而不是打一堆补丁。
 */
export function buildExportCss(config: ThemeConfig): string {
  const lines = (mode: ThemeMode) =>
    COLOR_TOKENS.map(
      (t) => `  --${t.key}: ${config[mode][t.key] ?? DEFAULTS[mode][t.key]};`
    ).join("\n")

  return [
    ":root {",
    `  --radius: ${config.radius ?? DEFAULT_RADIUS};`,
    lines("light"),
    "}",
    "",
    ".dark {",
    lines("dark"),
    "}",
    "",
  ].join("\n")
}

/* -------------------------------------------------------------------------- */
/* Provider                                                                    */
/* -------------------------------------------------------------------------- */

type ThemeConfigState = {
  config: ThemeConfig
  /** 当前生效值：有覆盖用覆盖，否则回退到 index.css 的出厂值 */
  getToken: (mode: ThemeMode, token: ColorToken) => string
  isOverridden: (mode: ThemeMode, token: ColorToken) => boolean
  radius: string
  dirty: boolean
  setToken: (mode: ThemeMode, token: ColorToken, value: string) => void
  resetToken: (mode: ThemeMode, token: ColorToken) => void
  setRadius: (value: string) => void
  resetRadius: () => void
  applyPreset: (preset: ThemePreset) => void
  resetAll: () => void
  exportCss: () => string
}

const ThemeConfigContext = React.createContext<ThemeConfigState | null>(null)

export function ThemeConfigProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [config, setConfig] = React.useState<ThemeConfig>(readThemeConfig)

  // useLayoutEffect 而不是 useEffect：在浏览器绘制之前就把变量写进去，
  // 避免切换预设时闪一帧旧配色。
  React.useLayoutEffect(() => {
    // get-or-create 必须幂等 —— main.tsx 开了 StrictMode，dev 下这段会跑两遍，
    // 直接 createElement + appendChild 会造出两个 #theme-overrides。
    // 同时这也让它能复用 index.html 防闪脚本已经建好的那个元素。
    let el = document.getElementById(
      THEME_STYLE_ELEMENT_ID
    ) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement("style")
      el.id = THEME_STYLE_ELEMENT_ID
      document.head.appendChild(el)
    }
    el.textContent = buildRuntimeCss(config)
    // 刻意不在 cleanup 里 remove：这个 <style> 是全局单例。
  }, [config])

  // 落盘走 debounce，和渲染路径解耦：拖滑杆时每帧写 localStorage 会明显卡顿。
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          THEME_CONFIG_STORAGE_KEY,
          JSON.stringify(config)
        )
      } catch {
        // 隐私模式 / 配额满时 setItem 会抛错。主题照样能用，只是这次不持久化。
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [config])

  const setToken = React.useCallback(
    (mode: ThemeMode, token: ColorToken, value: string) => {
      const normalized = normalizeOklch(value)
      if (!normalized) return
      setConfig((prev) => {
        const next: TokenOverrides = { ...prev[mode] }
        next[token] = normalized
        return mode === "dark"
          ? { ...prev, dark: next }
          : { ...prev, light: next }
      })
    },
    []
  )

  const resetToken = React.useCallback(
    (mode: ThemeMode, token: ColorToken) => {
      setConfig((prev) => {
        const next: TokenOverrides = { ...prev[mode] }
        delete next[token]
        return mode === "dark"
          ? { ...prev, dark: next }
          : { ...prev, light: next }
      })
    },
    []
  )

  const setRadius = React.useCallback((value: string) => {
    if (!isSafeRadius(value)) return
    setConfig((prev) => ({ ...prev, radius: value }))
  }, [])

  // 删掉 radius 这个 key，而不是把它写回默认值 —— 否则配置永远是「脏」的，
  // 注入的 CSS 里也会一直挂着一条毫无意义的覆盖。
  const resetRadius = React.useCallback(() => {
    setConfig((prev) => ({ v: prev.v, light: prev.light, dark: prev.dark }))
  }, [])

  const applyPreset = React.useCallback((preset: ThemePreset) => {
    // replace 而非 merge：如果 merge，用户先手改了 background 再点预设，
    // 会得到一份「一半新一半旧」、自己也说不清哪来的配色。
    // radius 是独立维度，预设不碰它。
    setConfig((prev) => ({
      v: CONFIG_VERSION,
      light: { ...preset.light },
      dark: { ...preset.dark },
      ...(prev.radius ? { radius: prev.radius } : {}),
    }))
  }, [])

  const resetAll = React.useCallback(() => setConfig(EMPTY_CONFIG), [])

  const value = React.useMemo<ThemeConfigState>(() => {
    return {
      config,
      getToken: (mode, token) => config[mode][token] ?? DEFAULTS[mode][token],
      isOverridden: (mode, token) => config[mode][token] !== undefined,
      radius: config.radius ?? DEFAULT_RADIUS,
      dirty:
        Object.keys(config.light).length > 0 ||
        Object.keys(config.dark).length > 0 ||
        config.radius !== undefined,
      setToken,
      resetToken,
      setRadius,
      resetRadius,
      applyPreset,
      resetAll,
      exportCss: () => buildExportCss(config),
    }
  }, [
    config,
    setToken,
    resetToken,
    setRadius,
    resetRadius,
    applyPreset,
    resetAll,
  ])

  return (
    <ThemeConfigContext.Provider value={value}>
      {children}
    </ThemeConfigContext.Provider>
  )
}

export function useThemeConfig() {
  const ctx = React.useContext(ThemeConfigContext)
  if (!ctx) {
    throw new Error("useThemeConfig 必须在 ThemeConfigProvider 内部使用")
  }
  return ctx
}
