# /sidebar 演示页：复刻 shadcn blocks 的 sidebar-08

## Context

当前仓库是一个 shadcn/ui 组件演示画廊（Vite 7 + React 19 + TS + Tailwind v4），**只有一个页面**：`src/App.tsx` 把 `src/sections/*.tsx` 拼在一起，靠 hash 锚点导航。它还带一个在线主题编辑器（`theme-config-provider.tsx` 注入 `<style id="theme-overrides">`）。

需求：新增一个**独立**页面挂在 `/sidebar` 路径下，1:1 复刻官方 block **sidebar-08「An inset sidebar with secondary navigation」**。

现状与需求之间的三条缺口：

1. **没有任何路由库**，`/sidebar` 目前无处可去。
2. **缺 4 个 ui 组件 + 1 个 hook**：`sidebar`、`sheet`、`breadcrumb`、`collapsible`、`hooks/use-mobile`。
3. **`index.css` 里没有任何 `--sidebar*` 令牌**，sidebar 组件的 `bg-sidebar` / `hover:bg-sidebar-accent` 等类会全部失效。

预期结果：`http://localhost:6201/sidebar`（dev）与 `:6200/sidebar`（prod）能直接打开一个与官方 demo 视觉一致的 inset 侧栏页面，明暗两色都正确，且尽量跟随本仓库已有的主题编辑器。

---

## 已核实的事实（实施时可直接依赖）

| 事实 | 结论 |
|---|---|
| `server.mjs` 的 `isRouteLike()` | 无扩展名路径回退 `index.html` 且返回 200 → **prod 不用改服务端**；`.jpg`/`/assets/` 前缀仍正常 404 |
| Vite dev server | 默认 SPA fallback → **dev 不用改 vite.config.ts** |
| registry 样式解析 | `components.json` 是 `style: new-york` + `tailwind.config: ""`（v4）→ CLI 走 **`new-york-v4`**，该样式用 `radix-ui` 元包（`import { Slot } from "radix-ui"` + `<Slot.Root>`），且 `cn` 从 npm 包 `"cn"` 导入 |
| 本仓库风格 | 20 个 ui 组件全部用**单包** `@radix-ui/react-*`，`cn` 来自 `@/lib/utils`，`src/` 下**零处** `"use client"` |
| 唯一缺失的 primitive | `@radix-ui/react-collapsible@1.1.20`（peer 支持 React 19；导出 `Root` / `CollapsibleTrigger` / `CollapsibleContent`，registry 源码用到的名字全都有） |
| tailwind-merge 3.6.0 | `twMerge('size-(--control-height)','size-7') === 'size-7'` ✅ → `SidebarTrigger` 无需改动，`button.tsx` 不用动 |
| `TooltipProvider` | `SidebarProvider` 内部自带 `<TooltipProvider delayDuration={0}>`，本仓库 `tooltip.tsx` 的 `Tooltip` 也自带一层 → **页面里不要再包** |
| lucide-react 0.544 | sidebar-08 用到的 22 个图标全部存在 |
| dropdown-menu / avatar | `nav-user.tsx` / `nav-projects.tsx` 需要的导出本仓库全都有 |

---

## 关键决策：不跑 `shadcn add`，手抄 registry JSON

CLI 在这个仓库里会做 3 件不可接受的事（读 `shadcn@4.21` 的 `updaters/*` 核实过）：

1. **无条件重写 `src/index.css`**：`sidebar` registry item 的 `cssVars` 至今仍是 **HSL 三元组**，会往你那份纯 oklch + 大段中文注释的 `:root` / `.dark` 主块里插 8 条 `hsl(...)`，深色还带两条蓝。
2. **装两个不想要的包**：`radix-ui` 元包 + npm 上的 `cn` 包（`transformImport` 只重写 `@/` 开头的 specifier，`"cn"` 会被原样保留并安装）。React 19 还会触发 `--force / --legacy-peer-deps` 弹窗，lockfile 变动面不可控。
3. **5 次覆盖确认**（`button` / `input` / `separator` / `tooltip` / `skeleton` 都是 `sidebar` 的 registryDependency）。答错一次就冲掉 `h-(--control-height)` 改造。

> CLI 仍有一个用法：`npx shadcn@latest add sidebar breadcrumb collapsible --dry-run` 只打印不落盘，可用来交叉核对手抄内容。

---

## 实施步骤

### Step 0 — 前置

```bash
cd /Users/sunny/shadcn-ui
git status                        # 确认干净（当前只有 .claude-plan-*/ 未跟踪）
npm i @radix-ui/react-collapsible # 唯一新增依赖；不要装 radix-ui、不要装 cn
```

### Step 1 — 落 4 个 ui 组件 + 1 个 hook

源码从 registry 拉，`.files[0].content` 即全文：

```
https://ui.shadcn.com/r/styles/new-york-v4/{sidebar,sheet,breadcrumb,collapsible,use-mobile}.json
```

逐文件改写表（改写点已按实际出现次数核过）：

| 目标文件 | 改写 |
|---|---|
| `src/components/ui/sidebar.tsx` | 删 `"use client"`；`from "cn"` → `@/lib/utils`；`import { Slot } from "radix-ui"` → `import { Slot } from "@radix-ui/react-slot"`；**`Slot.Root` → `Slot` 共 5 处**（`SidebarGroupLabel`/`SidebarGroupAction`/`SidebarMenuButton`/`SidebarMenuAction`/`SidebarMenuSubButton`）；`@/registry/new-york-v4/ui/*` → `@/components/ui/*`；`@/registry/new-york-v4/hooks/use-mobile` → `@/hooks/use-mobile` |
| `src/components/ui/sheet.tsx` | 删 `"use client"`；`from "cn"` → `@/lib/utils`；`import { Dialog as SheetPrimitive } from "radix-ui"` → `import * as SheetPrimitive from "@radix-ui/react-dialog"` |
| `src/components/ui/breadcrumb.tsx` | `from "cn"` → `@/lib/utils`；`Slot` 同上；**`Slot.Root` → `Slot` 1 处**（`BreadcrumbLink`） |
| `src/components/ui/collapsible.tsx` | 删 `"use client"`；`import { Collapsible as CollapsiblePrimitive } from "radix-ui"` → `import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"`；补 `import * as React from "react"`（它用了 `React.ComponentProps`，与本仓库其它 ui 文件风格一致） |
| `src/hooks/use-mobile.ts` | 原样落盘（新建 `src/hooks/` 目录，`components.json` 里 `hooks` 别名已指向 `@/hooks`） |

import 分组照本仓库既有风格（见 `src/components/ui/dialog.tsx`）：第三方一组 → 空行 → `@/` 一组。

**不要**把 sidebar / sheet 改造成 `--control-height` 驱动。理由：`--sidebar-width-icon: 3rem` 是硬编码常量，折叠态靠 `group-data-[collapsible=icon]:size-8!` 把按钮压进 `3rem − p-2×2` 的内容盒；接上令牌后用户把高度拖到 3rem（编辑器允许 1–4rem）会直接撑破图标栏，而且那几条带 `!` 的类会让令牌时灵时不灵。建议在 `sidebar.tsx` 顶部加一行中文注释说明「这里的固定高度是刻意的」。

### Step 2 — 落 sidebar-08 的 5 个块文件

源：`https://ui.shadcn.com/r/styles/new-york-v4/sidebar-08.json`（6 个 file，第 1 个是 page，见 Step 3）。

落到 `src/components/sidebar-08/`：`app-sidebar.tsx` / `nav-main.tsx` / `nav-projects.tsx` / `nav-secondary.tsx` / `nav-user.tsx`。

改写只有三类：删 `"use client"`；`@/registry/new-york-v4/blocks/sidebar-08/components/X` → `@/components/sidebar-08/X`；`@/registry/new-york-v4/ui/X` → `@/components/ui/X`。

**JSX 与 className 一个字不改** —— 这是 1:1 的本体。

> `data.user.avatar = "/avatars/shadcn.jpg"` 在本仓库不存在，会有一条控制台 404，Radix 的 `AvatarImage` 走 `onError` 显示 `AvatarFallback` 的 "CN"，功能无碍。保留路径 + 加一行注释说明即可；不想要 404 就丢一张占位图到 `public/avatars/shadcn.jpg`。

### Step 3 — 新建 `src/pages/sidebar.tsx`

以 `sidebar-08.json` 的 `page.tsx` 为准，改写 import 后：

- `export default function Page()` → `export default function SidebarPage()`
- `<header>` 左半部分（`SidebarTrigger` + `Separator` + `Breadcrumb`）**一个字不改**
- **唯一有意的偏离**：在同一个 `<header>` 里追加 `ml-auto` 区块，放「← 组件画廊」链接 + `<ModeToggle />`（`@/components/mode-toggle`）。原始 header 右侧本来就是空白，但没有它就没法在这个页面上切明暗色验收。代码里加注释标注这是唯一偏离。
- **不包 `TooltipProvider`**，**不放 `Toaster`**

### Step 4 — `src/index.css`（两处新增，既有内容一行不动）

**(a) `@theme inline` 内、`--color-chart-5` 之后**追加 8 条 `--color-sidebar*: var(--sidebar*)`（与上面那批同理，用 inline 才能让 `.dark` 覆盖时跟着变）。

**(b) 在 `--control-height-sm/lg` 那个派生 `:root` 之后、`@layer base` 之前**，新增一对**裸写**块（顺序不能反，`.dark` 必须在后 —— 二者特异度同为 (0,1,0)，靠文档顺序取胜）：

```css
:root {
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--accent);
  --sidebar-accent-foreground: var(--accent-foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--ring);
}

.dark {
  --sidebar: oklch(0.205 0 0);
  --sidebar-primary: var(--chart-1);
  --sidebar-primary-foreground: var(--foreground);
}
```

设计要点（都要写进注释）：

- **为什么独立成块**：主题编辑器的 `buildExportCss()` 只输出 `COLOR_TOKENS` 白名单里的令牌，用户拿导出结果整块替换上面的 `:root`/`.dark` 时，不应把这里的派生量一起冲掉。与 `--control-height-sm/lg` 独立成块是同一个理由。
- **为什么能自动跟随主题编辑器**：`:root` 和 `.dark` 选中的是同一个 `<html>`，编辑器注入的 `html:root:not(.dark)` / `html:root.dark` 特异度更高、赢下该元素上的 `--accent` 等；而派生式是在**同一元素上**做 computed-value 求值，拿到的就是覆盖后的值。**因此不需要动 `theme-tokens.ts`、`theme-presets.ts`、`index.html` 的 `TOKENS` 正则** —— sidebar 令牌不进白名单，那三处的「手工同步」约束不受影响。
- **为什么 `--sidebar` 必须写字面量**：`variant="inset"` 靠 `--sidebar` 与 `--background` 的明暗差显出内嵌卡片，而这个差在浅色是「侧栏更暗」、深色是「侧栏更亮」，方向相反，一条公式表达不了。数值取自 shadcn neutral 官方基色。
- **`.dark` 里为什么要覆盖 `--sidebar-primary`**：官方深色的 Logo 底色是蓝 `oklch(0.488 0.243 264.376)`，恰好等于本仓库 dark 的 `--chart-1`；用 `var(--chart-1)` 既与官方逐字节一致，又跟随编辑器。`--sidebar-primary-foreground` 深色官方是 `0.985`，等于 dark 的 `--foreground`（而非 `--primary-foreground` 的 0.205），所以也要覆盖。

**与官方 neutral 色板的逐条对拍**（`r/colors/neutral.json` 的 `cssVarsV4`）：浅色 8/8 逐字节一致；深色 7/8 一致，唯一差异是 `--sidebar-accent` = 本仓库 dark `--accent` 0.371 vs 官方 0.269 —— 成因是本仓库自身已有的、有意的偏离，且 0.371 让菜单 hover 比官方**更明显**（与侧栏面的明度比 1.72 vs 1.19），文字对比度 9.95:1 仍是 AAA。这里选 `var(--accent)` 而不是 `var(--muted)`（后者能做到深色也逐字节一致）是因为编辑器里 `accent` 的中文标签就是「强调色（悬停底色）」，语义对得上，改它时侧栏 hover 会跟着动。

### Step 5 — `src/main.tsx`（唯一的路由改动）

在 `createRoot` 之前加：

```tsx
// 全站只有两个页面，不值得引入路由库：按 pathname 二选一即可。
// 去掉尾部斜杠让 /sidebar 与 /sidebar/ 等价；页面间用普通 <a href> 整页跳转，
// cmd+click / 前进后退 / 直接粘链接全部天然可用，不需要 pushState + popstate。
// dev 由 Vite 的 SPA fallback 兜底，prod 由 server.mjs 的 isRouteLike() 兜底。
const pathname = window.location.pathname.replace(/\/+$/, "")
const Page = pathname === "/sidebar" ? SidebarPage : App
```

把 `<App />` 换成 `<Page />`。**`ThemeProvider` / `ThemeConfigProvider` 保持在外层不动** —— `/sidebar` 也要吃到 `.dark` 和注入的 `#theme-overrides`。

用静态 `import`，不用 `React.lazy`（会多闪一帧空白，本项目体量不值得）。

> 升级路径：将来页面变多再换 react-router，届时把这几行替换成 `<BrowserRouter>` 即可，本步骤没有引入任何需要拆掉的抽象。

### Step 6 — `src/App.tsx`（一处入口链接）

header 右侧 `<div className="ml-auto flex items-center gap-2">` 里、`<ModeToggle />` 之前插入：

```tsx
<Button variant="ghost" size="sm" asChild>
  <a href="/sidebar">Sidebar 演示</a>
</Button>
```

顶部补 `import { Button } from "@/components/ui/button"`。

### Step 7 — `README.md`（可选）

目录结构一节补 `src/pages/`、`src/components/sidebar-08/`、`src/hooks/`，写明 `/sidebar` 路由的存在与「不引路由库」的取舍。

---

## 需要修改/新建的文件

**新建**
- `src/pages/sidebar.tsx`
- `src/components/sidebar-08/{app-sidebar,nav-main,nav-projects,nav-secondary,nav-user}.tsx`
- `src/components/ui/{sidebar,sheet,breadcrumb,collapsible}.tsx`
- `src/hooks/use-mobile.ts`

**修改**
- `src/index.css`（两处新增）
- `src/main.tsx`（3 行路由分发）
- `src/App.tsx`（一个入口按钮 + 一条 import）
- `package.json` / `package-lock.json`（`@radix-ui/react-collapsible`）

**不要碰**：`src/lib/theme-tokens.ts`、`src/lib/theme-presets.ts`、`index.html`、`src/components/ui/button.tsx`、`src/components/ui/input.tsx`、`vite.config.ts`、`server.mjs`。

---

## 验证

### 静态检查

```bash
npm run typecheck        # tsc -b --noEmit
npm run build            # tsc -b && vite build
```

构建日志里**不应出现** `Module level directives cause errors when bundled` —— 出现说明还有 `"use client"` 没删干净。

污染自查（下面四条必须零输出 / 为 0）：

```bash
grep -rn 'from "cn"\|from "radix-ui"\|registry/new-york\|Slot\.Root\|use client' src/
grep -n '"cn"\|"radix-ui"' package.json
grep -c 'hsl(' src/index.css
git diff --stat                  # 修改过的文件应只有 index.css / main.tsx / App.tsx / package*.json
```

### 运行

```bash
./start.sh restart      # dev  → http://localhost:6201
./deploy.sh deploy      # prod → http://localhost:6200（会重新 vite build）
```

> 仓库里有 `.shadcn-ui-deploy.pid`，生产实例可能正跑着旧 `dist/`，**必须重新 deploy** 才能验收 prod。

### 手工验收清单

**路由 / SPA fallback**
- [ ] 首页点「Sidebar 演示」→ 跳到 `/sidebar`；地址栏直接输 `/sidebar` 回车也是 200（6201 与 6200 都试）
- [ ] `/sidebar/`（带尾斜杠）同样渲染
- [ ] 后退回首页且锚点仍可用；cmd+click 在新标签打开
- [ ] Network 面板：`/sidebar` 返回 `text/html` + `Cache-Control: no-cache`；不存在的 `/assets/xxx.js` 仍 404（没被 fallback 吞掉）

**浅色**
- [ ] 侧栏面（0.985）比页面背景（白）略灰，`SidebarInset` 是白色圆角卡片 + `shadow-sm`，md+ 下 `m-2` 留白
- [ ] 左上 Logo 方块深底 + 白色 Command 图标；菜单项 hover 出现浅灰底

**深色**
- [ ] 关系反过来：侧栏面（0.205）比 inset 卡片（0.145）**更亮**，边界仍清晰
- [ ] Logo 方块是**蓝底白图标**（`var(--chart-1)`，与官方一致）
- [ ] 刷新无白闪（`index.html` 防闪脚本生效）

**图标折叠态**
- [ ] `Cmd/Ctrl + B` 或点 `SidebarTrigger` 折叠；侧栏宽 `3rem`，菜单按钮压成 32px 不溢出
- [ ] 折叠态 hover 图标 → **立即**弹右侧 tooltip（延迟 0，验证「不用再包 TooltipProvider」的结论）
- [ ] Projects 整组消失；分组标题、子菜单、菜单右侧 action 全部隐藏
- [ ] inset 卡片左侧从 `ml-0` 变 `ml-2`；`document.cookie` 出现 `sidebar_state`

**移动端抽屉（视口 < 768px）**
- [ ] 桌面侧栏消失，`SidebarTrigger` 打开 `18rem` 宽的 Sheet 抽屉 + 半透明遮罩
- [ ] 抽屉右上角**没有** Sheet 自带的 ×（被 `[&>button]:hidden` 隐掉）
- [ ] Esc / 点遮罩可关；焦点 trap 正常，关闭后回到 trigger
- [ ] 抽屉内 NavUser 下拉是 `side="bottom" align="end"`（桌面是 `side="right"`）
- [ ] 控制台无 Radix "Missing Description" 警告

**面包屑 / 下拉 / 折叠子菜单**
- [ ] ≥md 显示 `Build Your Application > Data Fetching`；<md 只剩 `Data Fetching`
- [ ] 竖分隔线高 16px（`data-[orientation=vertical]:h-4` 压过 `separator.tsx` 的 `h-full`）
- [ ] Projects 项 hover 出 `…`；菜单开启期间 `…` 保持可见；菜单三项图标为 `text-muted-foreground`
- [ ] NavUser 菜单宽度等于触发器宽度（`w-(--radix-dropdown-menu-trigger-width) min-w-56`），触发器变 `data-[state=open]:bg-sidebar-accent`
- [ ] Playground 默认展开（`isActive`），其余收起；点 `>` 旋转 90° 并展开，子项左侧有竖线

**主题编辑器联动（验证派生方案）**
- [ ] 首页 Theme 分区改深色「强调色 accent」→ 回 `/sidebar`，菜单 hover 底色跟着变
- [ ] 改「主色 primary」→ 浅色 Logo 方块跟着变；改「图表色 1」→ 深色 Logo 方块跟着变
- [ ] 改控件高度 `--control-height` → 侧栏内按钮**不变**（预期行为），表头 `SidebarTrigger` 保持 28px
- [ ] 点「全部重置」→ 侧栏回到默认
