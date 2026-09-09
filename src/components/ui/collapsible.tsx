import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

/**
 * 与官方 collapsible 的唯一差异：这里没有基于 @radix-ui/react-collapsible，
 * 而是用 React context + Slot 自己实现了同一套 API（Root 的 asChild / defaultOpen /
 * open / onOpenChange，Trigger 的 asChild，以及 data-state="open|closed"）。
 * 原因是本次改动无法新增 npm 依赖，而 collapsible 是 sidebar-08 唯一缺失的 primitive。
 *
 * 行为对齐说明：
 * - 关闭时直接卸载内容，与 Radix 默认（不带 forceMount）一致；
 * - 未实现 --radix-collapsible-content-height，因此不支持高度过渡动画。
 *   sidebar-08 的 <CollapsibleContent> 没有任何动画类，不受影响。
 * 后续若装上 @radix-ui/react-collapsible，可整文件替换回官方版本，调用方无需改动。
 */

type CollapsibleContextValue = {
  open: boolean
  disabled?: boolean
  contentId: string
  onOpenToggle: () => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(
  null
)

function useCollapsibleContext(component: string) {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error(`${component} must be used within a Collapsible.`)
  }

  return context
}

function Collapsible({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled,
  asChild = false,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  asChild?: boolean
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const contentId = React.useId()
  const open = openProp ?? uncontrolledOpen

  const onOpenToggle = React.useCallback(() => {
    const nextOpen = !open
    if (openProp === undefined) {
      setUncontrolledOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }, [open, openProp, onOpenChange])

  const contextValue = React.useMemo<CollapsibleContextValue>(
    () => ({ open, disabled, contentId, onOpenToggle }),
    [open, disabled, contentId, onOpenToggle]
  )

  const Comp = asChild ? Slot : "div"

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <Comp
        data-slot="collapsible"
        data-state={open ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
        {...props}
      />
    </CollapsibleContext.Provider>
  )
}

function CollapsibleTrigger({
  asChild = false,
  onClick,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
}) {
  const { open, disabled, contentId, onOpenToggle } =
    useCollapsibleContext("CollapsibleTrigger")

  // 走「先攒对象再 spread」而不是 asChild ? Slot : "button" 的三元 Comp：
  // disabled / type 这两个非连字符属性不在 Slot 的 HTMLAttributes 里，
  // 直接写成 JSX 属性会在 Slot 分支上报类型错误，spread 则不受此限制。
  const triggerProps = {
    "data-slot": "collapsible-trigger",
    "data-state": open ? "open" : "closed",
    "data-disabled": disabled ? "" : undefined,
    "aria-controls": open ? contentId : undefined,
    "aria-expanded": open,
    disabled,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented && !disabled) {
        onOpenToggle()
      }
    },
    ...props,
  }

  return asChild ? (
    <Slot {...triggerProps} />
  ) : (
    <button type="button" {...triggerProps} />
  )
}

function CollapsibleContent({ ...props }: React.ComponentProps<"div">) {
  const { open, contentId } = useCollapsibleContext("CollapsibleContent")

  if (!open) {
    return null
  }

  return (
    <div
      id={contentId}
      data-slot="collapsible-content"
      data-state="open"
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
