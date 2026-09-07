import { InfoIcon } from "lucide-react"

import { Section } from "@/components/section"
import { ThemeEditor } from "@/components/theme-editor"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { COLOR_TOKENS } from "@/lib/theme-tokens"

// 这 5 个图表令牌在本项目没有任何组件消费，不摆出来的话拖滑杆是零反馈。
const CHART_TOKENS = COLOR_TOKENS.filter((t) => t.group === "图表")

export function ThemeSections() {
  return (
    <>
      <Section
        id="theme"
        title="Theme 主题"
        description="在线编辑 shadcn/ui 的全部设计令牌。改动通过注入的 CSS 变量即时生效，无需刷新页面，并会保存在 localStorage 里。"
      >
        <ThemeEditor />
      </Section>

      <Section
        id="theme-preview"
        title="实时预览"
        description="上面改动的令牌会立刻反映到这里 —— 所有组件都用语义类（bg-primary 等），没有任何硬编码颜色。"
      >
        <div className="flex w-full flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button>默认</Button>
            <Button variant="secondary">次要</Button>
            <Button variant="destructive">危险</Button>
            <Button variant="outline">描边</Button>
            <Button variant="ghost">幽灵</Button>
            <Button variant="link">链接</Button>
          </div>

          {/* 四个 size 摆一起，好让「控件高度」滑杆能看出 sm/lg 的派生关系 ——
              只放 default 的话拖滑杆看不到 ∓0.25rem 那点差别。 */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">小号</Button>
            <Button>默认</Button>
            <Button size="lg">大号</Button>
            <Button size="icon" aria-label="图标按钮">
              <InfoIcon />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>默认</Badge>
            <Badge variant="secondary">次要</Badge>
            <Badge variant="destructive">危险</Badge>
            <Badge variant="outline">描边</Badge>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="theme-preview-input">输入框（聚焦看焦点环）</Label>
              <Input id="theme-preview-input" placeholder="点我聚焦" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="theme-preview-check" defaultChecked />
              <Label htmlFor="theme-preview-check">复选框</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="theme-preview-switch" defaultChecked />
              <Label htmlFor="theme-preview-switch">开关</Label>
            </div>
          </div>

          <Progress value={62} />

          <Alert>
            <InfoIcon />
            <AlertTitle>Alert 会跟随 card / border / foreground</AlertTitle>
            <AlertDescription>
              圆角受 --radius 控制、控件高度受 --control-height
              控制，拖动上面两根滑杆都能看到这一整块跟着变。
            </AlertDescription>
          </Alert>

          <Separator />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              图表色 &amp; destructive-foreground
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                本项目没有组件用到这 6 个令牌，这里用色块把它们「用起来」，
                否则编辑器上拖滑杆会毫无反馈
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {CHART_TOKENS.map((t) => (
                <div
                  key={t.key}
                  className="flex w-24 flex-col gap-1 text-center"
                >
                  {/* 内联 style 而非 bg-chart-1：动态类名 Tailwind 不生成，
                      而且 bg-chart-* 在本项目从未出现过，压根没被编译出来。 */}
                  <div
                    className="h-10 rounded-md border"
                    style={{ background: `var(--${t.key})` }}
                  />
                  <code className="text-muted-foreground font-mono text-[10px]">
                    {t.key}
                  </code>
                </div>
              ))}
              <div className="flex w-24 flex-col gap-1 text-center">
                <div
                  className="flex h-10 items-center justify-center rounded-md border text-xs font-medium"
                  style={{
                    background: "var(--destructive)",
                    color: "var(--destructive-foreground)",
                  }}
                >
                  Aa
                </div>
                <code className="text-muted-foreground font-mono text-[10px]">
                  destructive
                </code>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
