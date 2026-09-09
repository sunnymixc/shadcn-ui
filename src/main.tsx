import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "@/App"
import { ThemeConfigProvider } from "@/components/theme-config-provider"
import { ThemeProvider } from "@/components/theme-provider"
import SidebarPage from "@/pages/sidebar"
import "@/index.css"

// 全站只有两个页面，不值得引入路由库：按 pathname 二选一即可。
// 去掉尾部斜杠让 /sidebar 与 /sidebar/ 等价；页面间用普通 <a href> 整页跳转，
// cmd+click / 前进后退 / 直接粘链接全部天然可用，不需要 pushState + popstate。
// dev 由 Vite 的 SPA fallback 兜底，prod 由 server.mjs 的 isRouteLike() 兜底。
// 用静态 import 而不是 React.lazy：本项目体量下多闪一帧空白不划算。
const pathname = window.location.pathname.replace(/\/+$/, "")
const Page = pathname === "/sidebar" ? SidebarPage : App

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* ThemeConfigProvider 必须在内层：主题编辑器要读 ThemeProvider 的 resolvedTheme
        才知道当前该编辑明色还是暗色那一套令牌。 */}
    <ThemeProvider defaultTheme="system" storageKey="shadcn-ui-theme">
      <ThemeConfigProvider>
        <Page />
      </ThemeConfigProvider>
    </ThemeProvider>
  </StrictMode>
)
