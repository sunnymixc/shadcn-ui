import * as React from "react"
import { AlertCircleIcon, CheckCircle2Icon, TerminalIcon } from "lucide-react"
import { toast } from "sonner"

import { Section } from "@/components/section"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

export function FeedbackSections() {
  const [progress, setProgress] = React.useState(13)

  React.useEffect(() => {
    // 进场后推进一次，纯粹为了让进度条的过渡动画肉眼可见
    const timer = setTimeout(() => setProgress(66), 600)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <Section
        id="alert"
        title="Alert 警告提示"
        description="默认与 destructive 两种变体，图标可选。"
      >
        <div className="grid w-full gap-4">
          <Alert>
            <TerminalIcon />
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>
              你可以用 CLI 把组件源码直接复制进项目里。
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>出错了</AlertTitle>
            <AlertDescription>
              会话已过期，请重新登录后再试。
            </AlertDescription>
          </Alert>
          <Alert>
            <CheckCircle2Icon />
            <AlertTitle>无描述的紧凑形态</AlertTitle>
          </Alert>
        </div>
      </Section>

      <Section
        id="sonner"
        title="Sonner 通知"
        description="轻量 toast，跟随当前明暗主题。"
      >
        <Button
          variant="outline"
          onClick={() => toast("这是一条普通通知")}
        >
          普通
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.success("操作成功", { description: "配置已保存。" })
          }
        >
          成功
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.error("操作失败", { description: "网络连接超时，请重试。" })
          }
        >
          失败
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast("会议提醒", {
              description: "周会将在 10 分钟后开始。",
              action: { label: "查看", onClick: () => toast("已打开日程") },
            })
          }
        >
          带操作
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.promise(
              new Promise((resolve) => setTimeout(resolve, 1500)),
              {
                loading: "正在部署…",
                success: "部署完成",
                error: "部署失败",
              }
            )
          }
        >
          异步
        </Button>
      </Section>

      <Section
        id="progress"
        title="Progress 进度条"
        description="受控的确定性进度，值变化时带过渡动画。"
      >
        <div className="w-full max-w-md space-y-4">
          <Progress value={progress} />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProgress((p) => Math.max(0, p - 20))}
            >
              -20
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProgress((p) => Math.min(100, p + 20))}
            >
              +20
            </Button>
            <span className="text-muted-foreground self-center text-sm tabular-nums">
              {progress}%
            </span>
          </div>
        </div>
      </Section>

      <Section
        id="skeleton"
        title="Skeleton 骨架屏"
        description="内容加载期间的占位形状。"
      >
        <div className="flex w-full max-w-md items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[70%]" />
            <Skeleton className="h-4 w-[45%]" />
          </div>
        </div>
      </Section>
    </>
  )
}
