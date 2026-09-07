// oklch 颜色的解析与序列化。
//
// 为什么不装 culori：本项目只需要「读一个 oklch 字符串 → 拖三根滑杆 → 写回去」，
// 用不到色彩空间转换，几十行正则就够，没必要为此引入一个依赖。
//
// 需要容忍的输入形态（前三种本仓库里真实存在，后几种来自用户粘贴）：
//   oklch(1 0 0)              —— :root 里大量如此
//   oklch(1 0 0 / 10%)        —— .dark 的 --border / --input
//   " oklch(0.145 0 0) "      —— getComputedStyle 可能带前导空格
//   oklch(1 0 0 / 0.1)        —— 小数写法的 alpha
//   oklch(62.8% 0.25 29)      —— L 写成百分数，Tailwind 官方调色板全是这格式
//   oklch(0.7 0.1 120deg)     —— 色相带单位

export type Oklch = {
  /** 亮度 0–1 */
  l: number
  /** 彩度 0–0.4 左右 */
  c: number
  /** 色相 0–360 */
  h: number
  /** 透明度 0–1；null 表示原值不带 alpha，序列化时也不要加 */
  a: number | null
}

/** sRGB 色域内 oklch 的彩度实际上限，超过这个值再拖滑杆是看不出变化的 */
export const MAX_CHROMA = 0.37

const OKLCH_RE =
  /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i

/** 把 "62.8%" / "0.628" 统一成 0–1 的数；base 是百分号对应的满值 */
function toNumber(raw: string, base: number): number {
  if (raw.endsWith("%")) return (parseFloat(raw) / 100) * base
  return parseFloat(raw)
}

/** 解析失败一律返回 null，绝不抛错 —— 调用点包含 useState 惰性初始化，抛错会白屏 */
export function parseOklch(input: string): Oklch | null {
  const m = OKLCH_RE.exec(input.trim())
  if (!m) return null

  const l = toNumber(m[1], 1)
  // 彩度的百分号基准是 0.4（CSS 规范如此），不是 1
  const c = toNumber(m[2], 0.4)
  const h = parseFloat(m[3])
  const a = m[4] === undefined ? null : toNumber(m[4], 1)

  if (!Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(h)) {
    return null
  }
  if (a !== null && !Number.isFinite(a)) return null

  return {
    l: clamp(l, 0, 1),
    c: clamp(c, 0, 0.5),
    h: ((h % 360) + 360) % 360,
    a: a === null ? null : clamp(a, 0, 1),
  }
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** toFixed 定位数再 parseFloat 去掉尾随零，避免 0.1+0.2 那类脏浮点写进 CSS */
function round(v: number, digits: number): number {
  return parseFloat(v.toFixed(digits))
}

export function formatOklch({ l, c, h, a }: Oklch): string {
  const body = `${round(l, 3)} ${round(c, 3)} ${round(h, 1)}`
  // alpha 统一序列化成百分号形式，和 index.css 里既有的 "/ 10%" 保持一致
  return a === null ? `oklch(${body})` : `oklch(${body} / ${round(a * 100, 1)}%)`
}

// 注入前的最后一道闸。两个理由都很实际：
// 1) 值来自 localStorage，可以被手改成 "red} html{display:none}" 越狱出声明块；
// 2) 更常见的是非法值触发 CSS 的 "invalid at computed-value time" ——
//    此时 var(--primary) 不会回退到默认令牌，而是变成 inherit/initial，
//    按钮会直接透明消失，整页看起来像坏了。
const SAFE_OKLCH_RE = /^oklch\([\d.]+ [\d.]+ [\d.]+(?: \/ [\d.]+%)?\)$/
const SAFE_RADIUS_RE = /^[\d.]+rem$/

export function isSafeOklch(value: string): boolean {
  return SAFE_OKLCH_RE.test(value)
}

export function isSafeRadius(value: string): boolean {
  return SAFE_RADIUS_RE.test(value)
}

/** 规范化：解析再序列化，顺便过一遍安全正则。任何一步失败返回 null。 */
export function normalizeOklch(input: string): string | null {
  const parsed = parseOklch(input)
  if (!parsed) return null
  const out = formatOklch(parsed)
  return isSafeOklch(out) ? out : null
}

export function parseRadius(input: string): number | null {
  const m = /^([\d.]+)rem$/.exec(input.trim())
  if (!m) return null
  const v = parseFloat(m[1])
  return Number.isFinite(v) ? v : null
}

export function formatRadius(rem: number): string {
  return `${round(clamp(rem, 0, 2), 3)}rem`
}
