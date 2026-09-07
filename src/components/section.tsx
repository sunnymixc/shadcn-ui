import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type SectionProps = {
  id: string
  title: string
  description: string
  children: React.ReactNode
}

// 20 个分区共用的外壳。抽出来是为了让 sections/*.tsx 只关心组件本身怎么摆，
// 不必各自重复一遍 Card + 标题 + 锚点 id 的样板。
export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-4">
          {children}
        </CardContent>
      </Card>
    </section>
  )
}
