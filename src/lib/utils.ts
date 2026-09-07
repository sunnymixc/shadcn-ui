import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// clsx 负责条件拼接，twMerge 负责消解 Tailwind 冲突类
// （例如外部传入的 px-8 应当覆盖组件默认的 px-4，而不是两者共存由声明顺序决定）。
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
