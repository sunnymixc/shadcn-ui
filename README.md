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
├── src/
│   ├── index.css         Tailwind v4 入口 + shadcn 主题 CSS 变量
│   ├── App.tsx           画廊页：侧栏导航 + 各分区
│   ├── lib/utils.ts      cn() 类名合并工具
│   ├── components/
│   │   ├── ui/           shadcn 组件源码（20 个）
│   │   ├── theme-provider.tsx  明暗主题 Context（localStorage + matchMedia）
│   │   ├── mode-toggle.tsx     右上角主题切换
│   │   └── section.tsx         分区外壳
│   └── sections/         各组件的演示分区
├── dist/                 构建产物（gitignore）
└── logs/                 运行 / 构建 / 安装日志（gitignore）
```

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
