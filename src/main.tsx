import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "@/App"
import { ThemeConfigProvider } from "@/components/theme-config-provider"
import { ThemeProvider } from "@/components/theme-provider"
import "@/index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* ThemeConfigProvider 必须在内层：主题编辑器要读 ThemeProvider 的 resolvedTheme
        才知道当前该编辑明色还是暗色那一套令牌。 */}
    <ThemeProvider defaultTheme="system" storageKey="shadcn-ui-theme">
      <ThemeConfigProvider>
        <App />
      </ThemeConfigProvider>
    </ThemeProvider>
  </StrictMode>
)
