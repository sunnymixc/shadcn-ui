import * as React from "react"
import { toast } from "sonner"

import { Section } from "@/components/section"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type Errors = { username?: string; email?: string }

// 用手写校验而不是 react-hook-form + zod：这个演示只需要证明表单控件、
// aria-invalid 样式和 toast 反馈三者串得通，为此引入 3 个互相有版本耦合的依赖不划算。
function validate(username: string, email: string): Errors {
  const errors: Errors = {}
  if (username.trim().length < 2) errors.username = "用户名至少 2 个字符"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "请填写有效的邮箱地址"
  return errors
}

export function FormsSections() {
  const [username, setUsername] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [bio, setBio] = React.useState("")
  const [plan, setPlan] = React.useState("")
  const [subscribe, setSubscribe] = React.useState(true)
  const [agreed, setAgreed] = React.useState(false)
  const [errors, setErrors] = React.useState<Errors>({})

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validate(username, email)
    setErrors(next)
    if (Object.keys(next).length > 0) {
      toast.error("表单校验未通过", { description: "请检查标红的字段。" })
      return
    }
    toast.success("提交成功", {
      description: `${username} <${email}>${plan ? ` · ${plan}` : ""}${
        subscribe ? " · 已订阅" : ""
      }`,
    })
  }

  return (
    <>
      <Section
        id="form"
        title="Form 表单"
        description="Input / Label / Textarea / Select / Checkbox / Switch 组合成的可提交表单，含校验与 toast 反馈。"
      >
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              placeholder="shadcn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-error" : undefined}
            />
            {errors.username ? (
              <p id="username-error" className="text-destructive text-sm">
                {errors.username}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                这是你的公开显示名称。
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-destructive text-sm">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">订阅套餐</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger id="plan" className="w-full">
                <SelectValue placeholder="请选择一个套餐" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>个人</SelectLabel>
                  <SelectItem value="free">免费版</SelectItem>
                  <SelectItem value="pro">专业版</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>团队</SelectLabel>
                  <SelectItem value="team">团队版</SelectItem>
                  <SelectItem value="enterprise">企业版</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">个人简介</Label>
            <Textarea
              id="bio"
              placeholder="简单介绍一下你自己…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className="text-muted-foreground text-sm">
              已输入 {bio.length} 个字符。
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="subscribe">邮件通知</Label>
              <p className="text-muted-foreground text-sm">
                接收产品更新与安全提醒。
              </p>
            </div>
            <Switch
              id="subscribe"
              checked={subscribe}
              onCheckedChange={setSubscribe}
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
            />
            <Label htmlFor="terms" className="leading-snug font-normal">
              我已阅读并同意服务条款
            </Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={!agreed}>
              提交
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUsername("")
                setEmail("")
                setBio("")
                setPlan("")
                setErrors({})
              }}
            >
              重置
            </Button>
          </div>
          {!agreed && (
            <p className="text-muted-foreground text-sm">
              勾选服务条款后才能提交（演示禁用态联动）。
            </p>
          )}
        </form>
      </Section>

      <Section
        id="input"
        title="Input 输入框"
        description="常规、禁用、只读、带 aria-invalid 的错误态，以及文件选择。"
      >
        <div className="grid w-full max-w-md gap-4">
          <Input placeholder="常规输入框" />
          <Input placeholder="已禁用" disabled />
          <Input defaultValue="只读内容" readOnly />
          <Input placeholder="错误态" aria-invalid />
          <Input type="file" />
        </div>
      </Section>
    </>
  )
}
