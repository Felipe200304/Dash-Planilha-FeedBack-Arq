"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Send,
  Building2,
  TrendingUp,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts"

const TT = {
  contentStyle: {
    backgroundColor: "oklch(0.17 0.005 260)",
    border: "1px solid oklch(0.28 0.008 260)",
    borderRadius: "8px",
    fontSize: "13px",
  },
  itemStyle: { color: "oklch(0.96 0 0)" },
  labelStyle: { color: "oklch(0.96 0 0)", fontWeight: 600, marginBottom: 4 },
}

type Stats = {
  total: number
  positivos: number
  negativos: number
  neutros: number
  semResposta: number
  respondidos: number
  enviados: number
  franquias: number
  positivePercent: number
  negativePercent: number
  neutralPercent: number
}

type FranchiseRow = {
  code: string
  name: string
  total: number
  positivos: number
  negativos: number
  neutros: number
  semResposta: number
  enviados: number
}

type Props = {
  stats: Stats
  franchiseList: FranchiseRow[]
}

export function OverviewTab({ stats, franchiseList }: Props) {
  const kpis = [
    { title: "Total Feedbacks", value: stats.total, icon: MessageSquare, color: "text-chart-3", bg: "bg-chart-3/10" },
    { title: "Positivos", value: stats.positivos, sub: `${stats.positivePercent.toFixed(1)}%`, icon: ThumbsUp, color: "text-primary", bg: "bg-primary/10" },
    { title: "Negativos", value: stats.negativos, sub: `${stats.negativePercent.toFixed(1)}%`, icon: ThumbsDown, color: "text-destructive", bg: "bg-destructive/10" },
    { title: "Neutros", value: stats.neutros, sub: `${stats.neutralPercent.toFixed(1)}%`, icon: MinusCircle, color: "text-chart-4", bg: "bg-chart-4/10" },
    { title: "Enviados", value: stats.enviados, sub: `${stats.total > 0 ? ((stats.enviados / stats.total) * 100).toFixed(1) : 0}%`, icon: Send, color: "text-chart-3", bg: "bg-chart-3/10" },
    { title: "Franquias", value: stats.franquias, icon: Building2, color: "text-chart-5", bg: "bg-chart-5/10" },
  ]

  // Pie chart data
  const sentimentData = [
    { name: "Positivos", value: stats.positivos, color: "oklch(0.65 0.19 160)" },
    { name: "Negativos", value: stats.negativos, color: "oklch(0.60 0.20 25)" },
    { name: "Neutros", value: stats.neutros, color: "oklch(0.75 0.15 80)" },
    { name: "Sem resposta", value: stats.semResposta, color: "oklch(0.40 0.01 260)" },
  ].filter((d) => d.value > 0)

  // Bar chart data
  const barData = franchiseList
    .slice(0, 15)
    .map((f) => ({
      code: f.code,
      name: f.name,
      total: f.total,
      positivos: f.positivos,
      negativos: f.negativos,
    }))

  // Ranking data
  const rankingData = franchiseList.map((f) => {
    const resp = f.positivos + f.negativos + f.neutros
    return {
      ...f,
      respondidos: resp,
      taxaPositiva: resp > 0 ? (f.positivos / resp) * 100 : 0,
    }
  }).sort((a, b) => b.taxaPositiva - a.taxaPositiva)

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.title} className="gap-0 py-0">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${k.bg}`}>
                <k.icon className={`size-5 ${k.color}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground">{k.title}</span>
                <span className={`text-xl font-bold tabular-nums ${k.color}`}>
                  {k.value.toLocaleString("pt-BR")}
                </span>
                {k.sub && <span className="text-[10px] text-muted-foreground">{k.sub} dos respondidos</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bar chart */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Feedbacks por Franquia</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.008 260)" vertical={false} />
                  <XAxis
                    dataKey="code"
                    tick={{ fill: "oklch(0.65 0.01 260)", fontSize: 11 }}
                    axisLine={{ stroke: "oklch(0.28 0.008 260)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.65 0.01 260)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    {...TT}
                    cursor={{ fill: "oklch(0.22 0.008 260 / 0.5)" }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { total: "Total", positivos: "Positivos", negativos: "Negativos" }
                      return [value, labels[name] || name]
                    }}
                    labelFormatter={(label) => {
                      const item = barData.find((d) => d.code === label)
                      return item ? item.name : label
                    }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {barData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={
                          index === 0
                            ? "oklch(0.65 0.19 160)"
                            : index < 3
                            ? "oklch(0.55 0.12 160)"
                            : "oklch(0.45 0.08 160)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Sentimento Geral</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...TT}
                    formatter={(value: number, name: string) => {
                      const pct = stats.respondidos > 0 ? ((value / stats.total) * 100).toFixed(1) : "0"
                      return [`${value} (${pct}%)`, name]
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value, entry: any) => (
                      <span style={{ color: "oklch(0.75 0.01 260)", fontSize: "12px" }}>
                         {value} <span style={{ color: "oklch(0.55 0.01 260)", marginLeft: "4px" }}>({entry.payload.value})</span>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-5 flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Ranking de Aproveitamento (% positivos dos respondidos)
            </h3>
          </div>
          <div className="space-y-3">
            {rankingData.map((f, i) => {
              const resp = f.respondidos
              const pct = f.taxaPositiva
              return (
                <div key={f.code} className="flex items-center gap-4">
                  <span className={`w-6 text-right font-mono text-xs font-bold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <span className="w-36 truncate text-xs font-semibold text-foreground">{f.name}</span>
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor:
                            pct >= 70
                              ? "oklch(0.65 0.19 160)"
                              : pct >= 40
                              ? "oklch(0.75 0.15 80)"
                              : "oklch(0.60 0.20 25)",
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right font-mono text-xs font-bold text-foreground">
                    {pct.toFixed(0)}%
                  </span>
                  <span className="w-20 text-right text-[10px] text-muted-foreground">
                    {f.positivos}/{resp} resp.
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
