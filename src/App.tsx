import { ModeToggle } from "@/components/mode-toggle"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { BasicsSections } from "@/sections/basics"
import { DataDisplaySections } from "@/sections/data-display"
import { FeedbackSections } from "@/sections/feedback"
import { FormsSections } from "@/sections/forms"
import { OverlaySections } from "@/sections/overlays"

// 侧栏导航项与各 Section 的 id 一一对应；新增分区时两处都要改。
const NAV_GROUPS = [
  {
    label: "基础",
    items: [
      { id: "button", label: "Button 按钮" },
      { id: "badge", label: "Badge 徽章" },
      { id: "avatar", label: "Avatar 头像" },
      { id: "separator", label: "Separator 分隔线" },
    ],
  },
  {
    label: "表单",
    items: [
      { id: "form", label: "Form 表单" },
      { id: "input", label: "Input 输入框" },
    ],
  },
  {
    label: "浮层",
    items: [
      { id: "dialog", label: "Dialog 对话框" },
      { id: "dropdown-menu", label: "DropdownMenu 菜单" },
      { id: "tooltip", label: "Tooltip 提示" },
    ],
  },
  {
    label: "数据展示",
    items: [
      { id: "table", label: "Table 表格" },
      { id: "tabs", label: "Tabs 标签页" },
    ],
  },
  {
    label: "反馈",
    items: [
      { id: "alert", label: "Alert 警告" },
      { id: "sonner", label: "Sonner 通知" },
      { id: "progress", label: "Progress 进度条" },
      { id: "skeleton", label: "Skeleton 骨架屏" },
    ],
  },
]

function App() {
  return (
    // 顶层包一个 TooltipProvider，让整页共享同一套延迟配置；
    // Tooltip 组件自身也带 Provider，所以单独使用同样安全。
    <TooltipProvider delayDuration={200}>
      <div className="bg-background min-h-svh">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            <span className="font-semibold">shadcn/ui 组件演示</span>
            <Badge variant="secondary">Vite + React + TS</Badge>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-muted-foreground hidden text-sm sm:inline">
                Tailwind v4
              </span>
              <ModeToggle />
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
          <aside className="hidden w-56 shrink-0 lg:block">
            <nav className="sticky top-20 space-y-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-muted-foreground mb-1 px-2 text-xs font-medium tracking-wide uppercase">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded-md px-2 py-1.5 text-sm transition-colors"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 flex-1 space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">组件画廊</h1>
              <p className="text-muted-foreground">
                下面每个分区都是一个真实可交互的 shadcn/ui
                组件。切换右上角主题可同时验证亮色与暗色两套配色。
              </p>
            </div>
            <Separator />

            <BasicsSections />
            <FormsSections />
            <OverlaySections />
            <DataDisplaySections />
            <FeedbackSections />

            <footer className="text-muted-foreground pt-4 pb-8 text-sm">
              开发模式 <code className="font-mono">./start.sh start</code> →
              6201 · 生产模式{" "}
              <code className="font-mono">./deploy.sh deploy</code> → 6200
            </footer>
          </main>
        </div>

        <Toaster position="bottom-right" richColors closeButton />
      </div>
    </TooltipProvider>
  )
}

export default App
