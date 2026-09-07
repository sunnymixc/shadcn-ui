import * as React from "react"
import { CheckIcon, CopyIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import { useThemeConfig } from "@/components/theme-config-provider"
import { useTheme } from "@/components/theme-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  formatOklch,
  formatRadius,
  MAX_CHROMA,
  parseOklch,
  parseRadius,
} from "@/lib/color"
import type { Oklch } from "@/lib/color"
import { THEME_PRESETS, presetSwatch } from "@/lib/theme-presets"
import type { ThemePreset } from "@/lib/theme-presets"
import { COLOR_TOKENS, DEFAULT_RADIUS, TOKEN_GROUPS } from "@/lib/theme-tokens"
import type { ColorToken, ThemeMode } from "@/lib/theme-tokens"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* 小零件                                                                       */
/* -------------------------------------------------------------------------- */

// 棋盘格垫底，这样 .dark 的 --border（oklch(1 0 0 / 10%)）这类半透明值也能看清。
const CHECKERBOARD: React.CSSProperties = {
  backgroundColor: "#fff",
  backgroundImage:
    "linear-gradient(45deg, #c9c9c9 25%, transparent 25%, transparent 75%, #c9c9c9 75%)," +
    "linear-gradient(45deg, #c9c9c9 25%, transparent 25%, transparent 75%, #c9c9c9 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 4px 4px",
}

type SliderProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  digits: number
  onChange: (value: number) => void
}

// 用原生 range 而不是 npx shadcn add slider：不额外引入 @radix-ui/react-slider，
// 而且这里一屏就有 80 多个滑杆，Radix 每个要渲染 Root/Track/Range/Thumb 四层。
// accent-primary 是静态类，Tailwind 能正常生成，滑轨本身也会跟着主色变 —— 顺带自我演示。
function Slider({
  label,
  value,
  min,
  max,
  step,
  digits,
  onChange,
}: SliderProps) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-muted-foreground w-4 shrink-0 font-mono text-[11px]">
        {label}
      </span>
      <input
        type="range"
        className="accent-primary h-1.5 min-w-0 flex-1 cursor-pointer"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
      />
      <span className="text-muted-foreground w-11 shrink-0 text-right font-mono text-[11px] tabular-nums">
        {value.toFixed(digits)}
      </span>
    </label>
  )
}

/* -------------------------------------------------------------------------- */
/* 单个令牌一行                                                                  */
/* -------------------------------------------------------------------------- */

type TokenRowProps = {
  mode: ThemeMode
  token: ColorToken
  label: string
  used: boolean
  value: string
  overridden: boolean
  onChange: (mode: ThemeMode, token: ColorToken, value: string) => void
  onReset: (mode: ThemeMode, token: ColorToken) => void
}

// memo 是必要的：拖动任意一根滑杆都会更新 Context，不拦一下会重渲染全部 24 行。
// 配合 provider 里 useCallback 稳定的 onChange/onReset，这里才真的能命中。
const TokenRow = React.memo(function TokenRow({
  mode,
  token,
  label,
  used,
  value,
  overridden,
  onChange,
  onReset,
}: TokenRowProps) {
  const parsed = parseOklch(value)
  const color: Oklch = parsed ?? { l: 0, c: 0, h: 0, a: null }

  const patch = (next: Partial<Oklch>) => {
    onChange(mode, token, formatOklch({ ...color, ...next }))
  }

  return (
    <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 size-8 shrink-0 rounded-md border"
          style={CHECKERBOARD}
        >
          {/* 必须内联 style。className={`bg-${token}`} 这类动态类名 Tailwind v4
              不会生成（它扫的是源码里的字面量），bg-chart-1 更是压根没被生成过。 */}
          <span
            className="block size-full rounded-[5px]"
            style={{ background: `var(--${token})` }}
          />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium">{label}</span>
            {overridden && (
              <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                已修改
              </Badge>
            )}
            {!used && (
              <Badge variant="outline" className="px-1 py-0 text-[10px]">
                本项目无组件使用
              </Badge>
            )}
          </div>
          <code className="text-muted-foreground block truncate font-mono text-[11px]">
            --{token}: {value}
          </code>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-7 shrink-0"
          aria-label={`重置 ${label}`}
          disabled={!overridden}
          onClick={() => onReset(mode, token)}
        >
          <RotateCcwIcon className="size-3.5" />
        </Button>
      </div>

      <div className="grid gap-1.5">
        <Slider
          label="L"
          value={color.l}
          min={0}
          max={1}
          step={0.001}
          digits={3}
          onChange={(l) => patch({ l })}
        />
        {/* 上限取 sRGB 色域内 oklch 的实际彩度上限；再往上拖是看不出变化的，
            那会让人以为滑杆坏了。 */}
        <Slider
          label="C"
          value={Math.min(color.c, MAX_CHROMA)}
          min={0}
          max={MAX_CHROMA}
          step={0.001}
          digits={3}
          onChange={(c) => patch({ c })}
        />
        <Slider
          label="H"
          value={color.h}
          min={0}
          max={360}
          step={0.5}
          digits={1}
          onChange={(h) => patch({ h })}
        />
        {/* 只有原值本来就带 alpha 时才给这根滑杆 —— 否则一编辑 --border
            就会把 "/ 10%" 悄悄吞掉，深色边框直接变成实心白。 */}
        {color.a !== null && (
          <Slider
            label="A"
            value={color.a}
            min={0}
            max={1}
            step={0.01}
            digits={2}
            onChange={(a) => patch({ a })}
          />
        )}
      </div>
    </div>
  )
})

/* -------------------------------------------------------------------------- */
/* 主体                                                                         */
/* -------------------------------------------------------------------------- */

function ModePanel({ mode }: { mode: ThemeMode }) {
  const { getToken, isOverridden, setToken, resetToken } = useThemeConfig()

  return (
    <div className="divide-y">
      {TOKEN_GROUPS.map((group) => (
        <div key={group} className="py-2">
          <p className="text-muted-foreground px-1 py-1 text-xs font-medium tracking-wide uppercase">
            {group}
          </p>
          {COLOR_TOKENS.filter((t) => t.group === group).map((t) => (
            <TokenRow
              key={t.key}
              mode={mode}
              token={t.key}
              label={t.label}
              used={t.used}
              value={getToken(mode, t.key)}
              overridden={isOverridden(mode, t.key)}
              onChange={setToken}
              onReset={resetToken}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ThemeEditor() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const {
    radius,
    setRadius,
    resetRadius,
    applyPreset,
    resetAll,
    exportCss,
    dirty,
    config,
  } = useThemeConfig()

  const [exported, setExported] = React.useState<string | null>(null)
  // 只在用户确实是被 tab 从 "跟随系统" 里踢出来时，才提示可以退回去
  const cameFromSystem = React.useRef(false)

  const handleModeChange = (next: string) => {
    if (theme === "system") cameFromSystem.current = true
    setTheme(next as ThemeMode)
  }

  const handleExport = async () => {
    const css = exportCss()
    // 局域网调试（start.sh 支持 HOST=0.0.0.0）走的是 http:// 非安全上下文，
    // navigator.clipboard 在那里是 undefined，直接调用会抛 TypeError。
    if (!navigator.clipboard?.writeText) {
      setExported(css)
      return
    }
    try {
      await navigator.clipboard.writeText(css)
      toast.success("主题 CSS 已复制到剪贴板", {
        description: "粘贴到 src/index.css，替换掉 :root 与 .dark 两段即可。",
      })
    } catch {
      setExported(css)
    }
  }

  const activePresetId = React.useMemo(() => {
    const same = (a: object, b: object) =>
      JSON.stringify(a) === JSON.stringify(b)
    return THEME_PRESETS.find(
      (p) => same(p.light, config.light) && same(p.dark, config.dark)
    )?.id
  }, [config.light, config.dark])

  const radiusRem = parseRadius(radius) ?? parseRadius(DEFAULT_RADIUS) ?? 0

  return (
    <div className="flex w-full flex-col gap-6">
      {/* ---------------- 预设 ---------------- */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">预设配色</p>
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((preset: ThemePreset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              className={cn(
                "gap-2",
                activePresetId === preset.id && "border-primary"
              )}
              onClick={() => applyPreset(preset)}
            >
              <span
                className="size-3.5 rounded-full border"
                style={{ background: presetSwatch(preset) }}
              />
              {preset.label}
              {activePresetId === preset.id && (
                <CheckIcon className="size-3.5" />
              )}
            </Button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          预设会整体替换配色（不是叠加），圆角设置不受影响。
        </p>
      </div>

      <Separator />

      {/* ---------------- 圆角 ---------------- */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">圆角 --radius</p>
          <Badge variant="secondary" className="font-mono">
            {radius}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={config.radius === undefined}
            onClick={resetRadius}
          >
            <RotateCcwIcon className="size-3.5" />
            恢复默认
          </Button>
        </div>
        <input
          type="range"
          className="accent-primary h-1.5 w-full max-w-md cursor-pointer"
          min={0}
          max={2}
          step={0.025}
          value={radiusRem}
          onChange={(e) => setRadius(formatRadius(e.currentTarget.valueAsNumber))}
        />
        <p className="text-muted-foreground text-xs">
          --radius 只定义在 :root、没有深浅两套，所以它是全局的。注意
          <code className="font-mono"> rounded-[2px] </code>
          这类任意值（tooltip 箭头、checkbox）是写死的，不参与缩放。
        </p>
      </div>

      <Separator />

      {/* ---------------- 逐令牌编辑 ---------------- */}
      <div className="flex flex-col gap-2">
        <Tabs value={resolvedTheme} onValueChange={handleModeChange}>
          <div className="flex flex-wrap items-center gap-2">
            <TabsList>
              <TabsTrigger value="light">浅色</TabsTrigger>
              <TabsTrigger value="dark">深色</TabsTrigger>
            </TabsList>
            <span className="text-muted-foreground text-xs">
              切换页签会同时切换整页外观，好让改动立刻看得见
            </span>
            {theme !== "system" && cameFromSystem.current && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  cameFromSystem.current = false
                  setTheme("system")
                }}
              >
                恢复跟随系统
              </Button>
            )}
          </div>

          {/* Radix 默认会卸载非激活面板，所以任何时刻只有一半的滑杆真正挂载 */}
          <TabsContent value="light">
            <ModePanel mode="light" />
          </TabsContent>
          <TabsContent value="dark">
            <ModePanel mode="dark" />
          </TabsContent>
        </Tabs>
      </div>

      <Separator />

      {/* ---------------- 操作 ---------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={handleExport}>
          <CopyIcon />
          导出 CSS
        </Button>
        {/* 配色是用户自己调的，完全可能把 background 调成和 foreground 一样、
            整页不可读，而且刷新后 localStorage 还在 —— 这个按钮是唯一的逃生口，
            所以样式必须用 Tailwind 内置调色板的固定色，不能依赖任何主题令牌。 */}
        <Button
          className="border border-red-700 bg-red-600 text-white hover:bg-red-700"
          disabled={!dirty}
          onClick={() => {
            resetAll()
            toast.success("已恢复出厂配色")
          }}
        >
          <RotateCcwIcon />
          全部重置
        </Button>
        <span className="text-muted-foreground text-xs">
          万一改到页面完全看不清，在控制台执行{" "}
          <code className="font-mono">
            localStorage.removeItem(&quot;shadcn-ui-theme-config&quot;)
          </code>{" "}
          后刷新即可。
        </span>
      </div>

      <Dialog open={exported !== null} onOpenChange={() => setExported(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>主题 CSS</DialogTitle>
            <DialogDescription>
              当前环境不支持自动复制（非 HTTPS 或非 localhost），请手动全选复制。
            </DialogDescription>
          </DialogHeader>
          {/* Textarea 带 field-sizing-content 会按内容撑高，而这里有 50 多行 CSS，
              所以外面套一层限高滚动容器，而不是去跟它的 field-sizing 打架。 */}
          <div className="max-h-[60vh] overflow-auto">
            <Textarea
              readOnly
              value={exported ?? ""}
              className="font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
