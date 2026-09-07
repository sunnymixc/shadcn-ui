import { ChevronDownIcon, CopyIcon, SettingsIcon, TrashIcon, UserIcon } from "lucide-react"

import { Section } from "@/components/section"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function OverlaySections() {
  return (
    <>
      <Section
        id="dialog"
        title="Dialog 对话框"
        description="模态对话框，含焦点陷阱、Esc 关闭、点击遮罩关闭与内置关闭按钮。"
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">编辑资料</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑资料</DialogTitle>
              <DialogDescription>
                修改后点击保存。按 Esc 或点击遮罩可以直接关闭。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dialog-name">名称</Label>
                <Input id="dialog-name" defaultValue="shadcn" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dialog-handle">用户名</Label>
                <Input id="dialog-handle" defaultValue="@shadcn" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>保存</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive">删除项目</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除？</DialogTitle>
              <DialogDescription>
                此操作不可撤销，将永久删除该项目及其全部数据。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive">确认删除</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section
        id="dropdown-menu"
        title="DropdownMenu 下拉菜单"
        description="含分组、分隔线、快捷键提示、子菜单与 destructive 变体。"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              打开菜单
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>我的账户</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserIcon />
                个人资料
                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <SettingsIcon />
                设置
                <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CopyIcon />
                复制链接
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>邀请成员</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>通过邮件</DropdownMenuItem>
                <DropdownMenuItem>通过链接</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <TrashIcon />
              删除账户
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      <Section
        id="tooltip"
        title="Tooltip 提示"
        description="悬停或键盘聚焦触发，四个方向可选。"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">上方</Button>
          </TooltipTrigger>
          <TooltipContent side="top">这是上方提示</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">右侧</Button>
          </TooltipTrigger>
          <TooltipContent side="right">这是右侧提示</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">下方</Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">这是下方提示</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="设置">
              <SettingsIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">图标按钮也能带提示</TooltipContent>
        </Tooltip>
      </Section>
    </>
  )
}
