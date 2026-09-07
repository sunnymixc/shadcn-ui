import { Section } from "@/components/section"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const invoices = [
  { id: "INV001", status: "已支付", method: "信用卡", amount: 250.0 },
  { id: "INV002", status: "待处理", method: "支付宝", amount: 150.0 },
  { id: "INV003", status: "未支付", method: "银行转账", amount: 350.0 },
  { id: "INV004", status: "已支付", method: "微信支付", amount: 450.0 },
]

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  已支付: "default",
  待处理: "secondary",
  未支付: "destructive",
}

export function DataDisplaySections() {
  const total = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)

  return (
    <>
      <Section
        id="table"
        title="Table 表格"
        description="含表头、表尾合计、悬停高亮与状态徽章的数据表格。"
      >
        <div className="w-full">
          <Table>
            <TableCaption>最近的账单记录。</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">单号</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>支付方式</TableHead>
                <TableHead className="text-right">金额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[invoice.status]}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{invoice.method}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    ¥{invoice.amount.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>合计</TableCell>
                <TableCell className="text-right tabular-nums">
                  ¥{total.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Section>

      <Section
        id="tabs"
        title="Tabs 标签页"
        description="键盘方向键可切换，内容区按需渲染。"
      >
        <Tabs defaultValue="account" className="w-full max-w-md">
          <TabsList>
            <TabsTrigger value="account">账户</TabsTrigger>
            <TabsTrigger value="password">密码</TabsTrigger>
            <TabsTrigger value="disabled" disabled>
              已禁用
            </TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="pt-4">
            <p className="text-muted-foreground text-sm">
              在这里修改账户信息。改完记得保存。
            </p>
          </TabsContent>
          <TabsContent value="password" className="pt-4">
            <p className="text-muted-foreground text-sm">
              修改密码后需要重新登录所有设备。
            </p>
          </TabsContent>
        </Tabs>
      </Section>
    </>
  )
}
