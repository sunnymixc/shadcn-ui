# shadcn-ui 演示项目

基于 **Vite + React + TypeScript + shadcn/ui（Tailwind v4）** 的纯前端组件演示，
配一套开发 / 生产双模式管理脚本。

## 技术栈

| 项 | 说明 |
| --- | --- |
| 构建 | Vite 7 |
| 框架 | React 19 + TypeScript 5.9 |
| 样式 | Tailwind CSS **v4**（`@tailwindcss/vite` 插件，**无 `tailwind.config.js`**） |
| 组件 | shadcn/ui（new-york 风格，源码直接在 `src/components/ui/`） |
| 图标 | lucide-react |
| 通知 | sonner |
| 生产宿主 | 自写零依赖 Node 静态服务器 `server.mjs` |

## 快速开始

```bash
chmod +x start.sh deploy.sh   # 仅首次：给脚本加可执行权限

./start.sh start        # 开发模式 → http://localhost:6201（首次会自动 npm install）
./deploy.sh deploy      # 生产模式 → http://localhost:6200
```

两者端口、PID、日志完全隔离，**可以同时运行**。

## 脚本速查

### `./start.sh` — 开发模式（端口 6201，vite dev server，带 HMR）

| 命令 | 说明 |
| --- | --- |
| `start` | 启动。按需装依赖，端口被占则报错退出（不抢占） |
| `stop` | 停止。PID 文件失效时按端口回退，但只杀属于本项目的进程 |
| `restart` | 等价于 `stop` + `start` |
| `status` | 查看状态。运行中退出码 0，已停止退出码 1 |
| `man` | 完整中文手册（`help` / `-h` / `--help` 等效） |

### `./deploy.sh` — 生产模式（端口 6200，`node server.mjs` 托管 `dist/`）

| 命令 | 说明 |
| --- | --- |
| `build` | `vite build` 产出 `dist/`。**只编译，不动运行中的服务** |
| `start` | 启动静态服务器。产物不存在会提示先 `build` |
| `stop` | 停止（先 SIGTERM 优雅关闭，超时才强杀） |
| `deploy` | `build` + `stop` + `start`。**先编译成功才停服**，编译失败旧服务不受影响 |
| `status` | 状态 + PID + 端口 + 产物大小与构建时间 |
| `man` | 完整中文手册 |

环境变量：两个脚本都支持 `PORT`、`HOST` 覆盖；`deploy.sh` 额外支持 `ACCESS_LOG=1`
打开逐请求访问日志。

## 目录结构

```
├── start.sh              开发模式管理脚本（6201）
├── deploy.sh             生产模式管理脚本（6200）
├── server.mjs            零依赖 Node 静态服务器（生产宿主）
├── components.json       shadcn CLI 配置（新增组件用 npx shadcn@latest add）
├── vite.config.ts        含 @tailwindcss/vite 插件与 @ 路径别名
├── index.html            含防 FOUC 内联脚本（首帧就定好明暗与自定义配色）
├── src/
│   ├── index.css         Tailwind v4 入口 + shadcn 主题 CSS 变量
│   ├── main.tsx          入口 + 按 pathname 的两页分发（/ 与 /sidebar）
│   ├── App.tsx           画廊页：侧栏导航 + 各分区
│   ├── pages/
│   │   └── sidebar.tsx   /sidebar 独立页：官方 block sidebar-08 的复刻
│   ├── hooks/
│   │   └── use-mobile.ts 768px 断点的媒体查询 hook（sidebar 移动端抽屉用）
│   ├── lib/
│   │   ├── utils.ts          cn() 类名合并工具
│   │   ├── color.ts          oklch 解析 / 序列化 / 安全校验
│   │   ├── theme-tokens.ts   可编辑令牌清单 + 出厂默认值
│   │   └── theme-presets.ts  6 套预设配色
│   ├── components/
│   │   ├── ui/           shadcn 组件源码（24 个）
│   │   ├── sidebar-08/   官方 block sidebar-08 的 5 个块组件（仅 /sidebar 使用）
│   │   ├── theme-provider.tsx        明暗主题 Context（localStorage + matchMedia）
│   │   ├── theme-config-provider.tsx 自定义配色 Context + 运行时 CSS 变量注入
│   │   ├── theme-editor.tsx          Theme 分区里的主题编辑器
│   │   ├── mode-toggle.tsx           右上角主题切换
│   │   └── section.tsx               分区外壳
│   └── sections/         各组件的演示分区
├── dist/                 构建产物（gitignore）
└── logs/                 运行 / 构建 / 安装日志（gitignore）
```

## 路由

全站只有两个页面，`src/main.tsx` 直接按 `window.location.pathname` 二选一渲染，
**没有引入路由库**：

| 路径 | 页面 |
| --- | --- |
| `/` | `src/App.tsx` 组件画廊（内部靠 hash 锚点导航） |
| `/sidebar`（含尾斜杠） | `src/pages/sidebar.tsx`，官方 block sidebar-08 |

两页之间用普通 `<a href>` 整页跳转，cmd+click / 前进后退 / 直接粘链接天然可用。
dev 由 Vite 的 SPA fallback 兜底，prod 由 `server.mjs` 的 `isRouteLike()` 兜底，
两边都不需要额外配置。页面变多时把这几行换成 `<BrowserRouter>` 即可，
当前写法没有引入任何需要先拆掉的抽象。

`ThemeProvider` / `ThemeConfigProvider` 仍在最外层，两个页面共享明暗主题与自定义配色。

## server.mjs 的行为

- `/assets/*`（Vite 内容 hash 产物）→ `Cache-Control: public, max-age=31536000, immutable`
- `index.html` → `Cache-Control: no-cache`，配合 ETag 走 304
- SPA history fallback：路径不存在且**看起来像页面路由**时返回 `index.html`（200）
- **`/assets/` 下与带已知资源扩展名的路径不回退，直接 404** —— 避免拼错的 `.js`
  拿到 `text/html` 后只报 MIME 错误，把「文件不存在」这个真因藏住
- 只接受 `GET` / `HEAD`（其余 405）；解码后越出 `dist/` 的路径 403
- 收到 `SIGTERM` 优雅关闭

## 新增 shadcn 组件

```bash
npx shadcn@latest add <组件名>
```

`components.json` 已配置好（new-york 风格、neutral 基色、CSS variables、`@/` 别名），
CLI 会把源码直接写进 `src/components/ui/`。

## 注意

- Tailwind **v4** 没有 `tailwind.config.js`，主题在 `src/index.css` 的 `@theme inline`
  与 `:root` / `.dark` 里。暗色变体依赖 `@custom-variant dark (&:is(.dark *));` 这一行，
  删掉它主题切换会失效。
- 首次启动请**串行**执行两个脚本（npm 没有跨进程锁，并发 `npm install` 会互相破坏）。

## 主题编辑（Theme 分区）

页面顶部的 **Theme 主题** 分区可以在线改全部设计令牌，改动通过注入
`<style id="theme-overrides">` 即时生效（不刷新页面），并存在 localStorage
的 `shadcn-ui-theme-config` 下。

可调令牌有三类：24 个 oklch 配色（明暗各一套）、圆角 `--radius`、以及控件基准
高度 `--control-height`（28–48px，Button / Input / SelectTrigger / TabsList 的
default 尺寸都由它派生）。后两者只定义在 `:root`、不分明暗，所以是全局的。

`--control-height-sm` / `--control-height-lg` 是 `index.css` 里**单独成块**的派生层
（`calc(var(--control-height) ∓ 0.25rem)`），不要手改，也刻意不在「导出 CSS」的
输出范围内 —— 导出的那段是给你整块替换 `:root` 用的，派生层混进去会被一起冲掉。
Badge（靠 padding 撑高）、Textarea（`field-sizing-content`）、Table 表头（行密度）
不参与高度缩放。

注入用的选择器是 `html:root:not(.dark)` / `html:root.dark` / `html:root`，
**靠特异度 (0,2,1) 取胜，不是靠文档顺序**。这一点不能改成朴素的 `:root` / `.dark`：
`index.css` 里那两块是裸写的、特异度同为 (0,1,0)，`.dark` 仅靠写在后面才赢；
注入的 `<style>` 排在它之后，若也写 `:root`，深色模式下会反过来压住 `.dark`，
导致「只改了浅色、深色跟着变」。dev 用 `<style>` 注入、prod 用 `<link>`，
head 顺序本来就不一致，所以顺序是靠不住的。

万一配色改到页面无法阅读，在控制台执行
`localStorage.removeItem("shadcn-ui-theme-config")` 后刷新即可。
