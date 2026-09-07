import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 端口/host 由 start.sh 通过命令行参数传入（--port --strictPort --host），
  // 这里不写死，避免脚本参数与配置文件两处来源打架。
})
