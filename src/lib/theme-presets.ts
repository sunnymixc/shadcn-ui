import type { TokenOverrides } from "@/lib/theme-tokens"

export type ThemePreset = {
  id: string
  label: string
  light: TokenOverrides
  dark: TokenOverrides
}

// 每个预设都是「稀疏覆盖」——只列出与出厂 neutral 不同的令牌，其余继承 index.css。
//
// ⚠️ 深色侧必须同时给 primary 和 primary-foreground：
// 深色的出厂值是「近白底 + 近黑字」，如果只把 primary 换成蓝色而不动 foreground，
// 会得到黑字蓝底的低对比度结果。
//
// 色值取自 Tailwind v4 官方调色板的 oklch 值。
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "neutral",
    label: "默认",
    light: {},
    dark: {},
  },
  {
    id: "blue",
    label: "蓝",
    light: {
      primary: "oklch(0.546 0.245 262.881)",
      "primary-foreground": "oklch(0.985 0 0)",
      ring: "oklch(0.546 0.245 262.881)",
      accent: "oklch(0.932 0.032 255.585)",
      "accent-foreground": "oklch(0.424 0.199 265.638)",
    },
    dark: {
      primary: "oklch(0.623 0.214 259.815)",
      "primary-foreground": "oklch(0.985 0 0)",
      ring: "oklch(0.488 0.243 264.376)",
      accent: "oklch(0.379 0.146 265.522)",
      "accent-foreground": "oklch(0.932 0.032 255.585)",
    },
  },
  {
    id: "green",
    label: "绿",
    light: {
      primary: "oklch(0.627 0.194 149.214)",
      "primary-foreground": "oklch(0.985 0 0)",
      ring: "oklch(0.627 0.194 149.214)",
      accent: "oklch(0.962 0.044 156.743)",
      "accent-foreground": "oklch(0.448 0.119 151.328)",
    },
    dark: {
      primary: "oklch(0.723 0.219 149.579)",
      "primary-foreground": "oklch(0.266 0.065 152.934)",
      ring: "oklch(0.527 0.154 150.069)",
      accent: "oklch(0.393 0.095 152.535)",
      "accent-foreground": "oklch(0.962 0.044 156.743)",
    },
  },
  {
    id: "violet",
    label: "紫",
    light: {
      primary: "oklch(0.541 0.281 293.009)",
      "primary-foreground": "oklch(0.985 0 0)",
      ring: "oklch(0.541 0.281 293.009)",
      accent: "oklch(0.943 0.029 294.588)",
      "accent-foreground": "oklch(0.432 0.232 292.759)",
    },
    dark: {
      primary: "oklch(0.606 0.25 292.717)",
      "primary-foreground": "oklch(0.985 0 0)",
      ring: "oklch(0.491 0.27 292.581)",
      accent: "oklch(0.38 0.189 293.745)",
      "accent-foreground": "oklch(0.943 0.029 294.588)",
    },
  },
  {
    id: "orange",
    label: "橙",
    light: {
      primary: "oklch(0.646 0.222 41.116)",
      "primary-foreground": "oklch(0.985 0 0)",
      ring: "oklch(0.646 0.222 41.116)",
      accent: "oklch(0.954 0.038 75.164)",
      "accent-foreground": "oklch(0.47 0.157 37.304)",
    },
    dark: {
      primary: "oklch(0.705 0.213 47.604)",
      "primary-foreground": "oklch(0.985 0 0)",
      ring: "oklch(0.553 0.195 38.402)",
      accent: "oklch(0.408 0.123 38.172)",
      "accent-foreground": "oklch(0.954 0.038 75.164)",
    },
  },
  {
    id: "rose",
    label: "玫瑰",
    light: {
      primary: "oklch(0.586 0.253 17.585)",
      "primary-foreground": "oklch(0.985 0 0)",
      ring: "oklch(0.586 0.253 17.585)",
      accent: "oklch(0.941 0.03 12.58)",
      "accent-foreground": "oklch(0.455 0.188 13.697)",
    },
    dark: {
      primary: "oklch(0.645 0.246 16.439)",
      "primary-foreground": "oklch(0.985 0 0)",
      ring: "oklch(0.514 0.222 16.935)",
      accent: "oklch(0.41 0.159 10.272)",
      "accent-foreground": "oklch(0.941 0.03 12.58)",
    },
  },
]

/** 预设按钮上的圆色块用哪个颜色；「默认」预设没有覆盖，退回出厂主色。 */
export function presetSwatch(preset: ThemePreset): string {
  return preset.light.primary ?? "oklch(0.205 0 0)"
}
