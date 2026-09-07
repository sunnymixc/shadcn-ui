import { ArrowRightIcon, DownloadIcon, Loader2Icon, TrashIcon } from "lucide-react"

import { Section } from "@/components/section"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function BasicsSections() {
  return (
    <>
      <Section
        id="button"
        title="Button 按钮"
        description="6 种 variant × 4 种 size，支持图标、加载态、禁用态与 asChild 渲染为链接。"
      >
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button>默认</Button>
            <Button variant="secondary">次要</Button>
            <Button variant="destructive">危险</Button>
            <Button variant="outline">描边</Button>
            <Button variant="ghost">幽灵</Button>
            <Button variant="link">链接</Button>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">小号</Button>
            <Button size="default">默认</Button>
            <Button size="lg">大号</Button>
            <Button size="icon" aria-label="下载">
              <DownloadIcon />
            </Button>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button>
              <DownloadIcon />
              带图标
            </Button>
            <Button variant="outline">
              下一步
              <ArrowRightIcon />
            </Button>
            <Button disabled>
              <Loader2Icon className="animate-spin" />
              加载中
            </Button>
            <Button variant="destructive" disabled>
              <TrashIcon />
              已禁用
            </Button>
            {/* asChild：样式挂到 <a> 上，而不是把 <a> 塞进 <button> */}
            <Button asChild variant="link">
              <a href="https://ui.shadcn.com" target="_blank" rel="noreferrer">
                跳转到官网
              </a>
            </Button>
          </div>
        </div>
      </Section>

      <Section
        id="badge"
        title="Badge 徽章"
        description="用于状态标记的小尺寸标签，4 种 variant。"
      >
        <Badge>默认</Badge>
        <Badge variant="secondary">次要</Badge>
        <Badge variant="destructive">危险</Badge>
        <Badge variant="outline">描边</Badge>
        <Badge className="bg-emerald-600 text-white">运行中</Badge>
      </Section>

      <Section
        id="avatar"
        title="Avatar 头像"
        description="图片加载失败或加载期间自动回退到 Fallback 文本。"
      >
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
          <AvatarFallback>SC</AvatarFallback>
        </Avatar>
        <Avatar className="size-12">
          <AvatarImage src="https://github.com/vercel.png" alt="vercel" />
          <AvatarFallback>VC</AvatarFallback>
        </Avatar>
        {/* 故意给一个不存在的地址，用来验证 Fallback 真的会生效 */}
        <Avatar className="size-12">
          <AvatarImage src="/does-not-exist.png" alt="回退示例" />
          <AvatarFallback>回退</AvatarFallback>
        </Avatar>
      </Section>

      <Section
        id="separator"
        title="Separator 分隔线"
        description="水平与垂直两种朝向，默认标记为 decorative（不进无障碍树）。"
      >
        <div className="w-full">
          <div className="space-y-1">
            <h4 className="text-sm leading-none font-medium">shadcn/ui</h4>
            <p className="text-muted-foreground text-sm">
              可复制到项目里的组件集合。
            </p>
          </div>
          <Separator className="my-4" />
          <div className="flex h-5 items-center space-x-4 text-sm">
            <div>文档</div>
            <Separator orientation="vertical" />
            <div>源码</div>
            <Separator orientation="vertical" />
            <div>示例</div>
          </div>
        </div>
      </Section>
    </>
  )
}
