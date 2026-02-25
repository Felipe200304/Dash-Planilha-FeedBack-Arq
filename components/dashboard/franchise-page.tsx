"use client"

// Test commit: Verifying GitHub connection
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Send,
  TrendingUp,
  AlertTriangle,
  PartyPopper,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { format, parse, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { FeedbackRow } from "@/lib/franchises"
import { formatPhoneNumber } from "@/lib/utils"
// force refresh
import { ResolutionCell } from "@/components/dashboard/resolution-cell"

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

type FranchiseData = {
  code: string
  name: string
  total: number
  positivos: number
  negativos: number
  neutros: number
  semResposta: number
  enviados: number
  eventos: Record<string, { total: number; positivos: number; negativos: number; neutros: number }>
}

type Props = {
  franchiseList: FranchiseData[]
  selected: string
  onSelect: (v: string) => void
  rows: FeedbackRow[]
}

export function FranchisePage({ franchiseList, selected, onSelect, rows = [] }: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // If "all", compute aggregated, otherwise find the specific franchise
  const current =
    selected === "all"
      ? aggregateAll(franchiseList)
      : franchiseList.find((f) => f.code === selected) || null

  if (!current) return <div>Franquia nao encontrada</div>

  const respondidos = current.positivos + current.negativos + current.neutros
  const taxaPositiva = respondidos > 0 ? (current.positivos / respondidos) * 100 : 0
  const taxaNegativa = respondidos > 0 ? (current.negativos / respondidos) * 100 : 0
  const taxaNeutra = respondidos > 0 ? (current.neutros / respondidos) * 100 : 0
  const taxaEnvio = current.total > 0 ? (current.enviados / current.total) * 100 : 0
  const taxaResposta = current.total > 0 ? (respondidos / current.total) * 100 : 0

  const sentimentPie = [
    { name: "Positivos", value: current.positivos, color: "oklch(0.65 0.19 160)" },
    { name: "Negativos", value: current.negativos, color: "oklch(0.60 0.20 25)" },
    { name: "Neutros", value: current.neutros, color: "oklch(0.75 0.15 80)" },
    { name: "Sem resposta", value: current.semResposta, color: "oklch(0.40 0.01 260)" },
  ].filter((d) => d.value > 0)

  const eventArray = Object.entries(current.eventos)
    .map(([evento, d]) => ({
      evento,
      ...d,
      aproveitamento: d.total > 0 ? (d.positivos / d.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // --- TIME TREND ANALYSIS ---
  // 1. Filter rows for current selection
  const relevantRows = rows.filter((r) => {
    // Basic check
    if (!r.franquia) return false
    
    // Normalize franchise key logic (must match dashboard.tsx)
    let franchiseKey = r.franquia
    
    // Normalize logic
    if (franchiseKey === "Joinville") franchiseKey = "JOI"
    if (franchiseKey === "Mogi") franchiseKey = "MGM"
    if (franchiseKey === "Sorocaba") franchiseKey = "SOD"
    if (franchiseKey === "Itu") franchiseKey = "ITU"
    if (franchiseKey === "Pouso Alegre") franchiseKey = "MPA"
    if (franchiseKey === "Santos") franchiseKey = "STA"
    if (franchiseKey === "Uberlândia" || franchiseKey === "Uberlandia") franchiseKey = "UID"
    if (franchiseKey === "Guarulhos") franchiseKey = "GRU"
    if (franchiseKey === "São Caetano" || franchiseKey === "Sao Caetano") franchiseKey = "SCT"
    
    // Updates: Separate "Lanche" franchises
    if (franchiseKey === "São Paulo Lanche") franchiseKey = "SCTL" // Separate
    if (franchiseKey === "Campinas Lanche") franchiseKey = "VCPL" // Separate

    if (franchiseKey === "Osasco") franchiseKey = "OSC"
    if (franchiseKey === "Rio de Janeiro") franchiseKey = "RJB"
    if (franchiseKey === "Jundiaí" || franchiseKey === "Jundiai") franchiseKey = "JDI"
    if (franchiseKey === "Limeira") franchiseKey = "QGB"
    if (franchiseKey === "Ribeirão Preto" || franchiseKey === "Ribeirao Preto") franchiseKey = "RBP"
    if (franchiseKey === "SJC" || franchiseKey === "São José dos Campos") franchiseKey = "SJC"
    // if (franchiseKey === "Campinas Lanche") franchiseKey = "Campinas" // Removed merge
    if (franchiseKey === "Campinas") franchiseKey = "VCP" // Kept normal Campinas mapping
    return franchiseKey === selected
  })

  // Pagination Logic
  const negativeRows = relevantRows.filter((r) => r.sentiment === "negative")
  const totalPages = Math.ceil(negativeRows.length / itemsPerPage)
  
  const currentNegativeRows = negativeRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // 2. Group by Month (using dataDisparo or dataEvento)
  const trendMap = new Map<string, { total: number; positive: number; sortKey: number }>()
  
  for (const row of relevantRows) {
    if (row.sentiment === null) continue; // Only count respondents for positivity trend? Or all? Usually respondents.
    
    const dateStr = row.dataEvento || row.dataDisparo
    if (!dateStr) continue

    let dateObj: Date | null = null
    
    // Simple parsing logic
    if (dateStr.includes("/")) {
        const p = dateStr.split("/") // dd/mm/yyyy
        if (p.length === 3) dateObj = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]))
    } else {
        dateObj = new Date(dateStr)
    }

    if (!dateObj || isNaN(dateObj.getTime())) continue

    const key = format(dateObj, "MMM/yy", { locale: ptBR })
    const sortKey = dateObj.getFullYear() * 100 + dateObj.getMonth()

    if (!trendMap.has(key)) {
        trendMap.set(key, { total: 0, positive: 0, sortKey })
    }

    const e = trendMap.get(key)!
    e.total++
    if (row.sentiment === "positive") e.positive++
  }

  const trendData = Array.from(trendMap.entries())
    .map(([date, d]) => ({
      date,
      aproveitamento: d.total > 0 ? (d.positive / d.total) * 100 : 0,
      total: d.total,
      sortKey: d.sortKey
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
    // .slice(-12) // Show all history or slice? Let's show all for now.
 
  const eventBarData = eventArray.map((e) => ({
    name: e.evento,
    Positivos: e.positivos,
    Negativos: e.negativos,
    Neutros: e.neutros,
  }))

  // Approval label
  const approvalLabel =
    taxaPositiva >= 70 ? "Excelente" : taxaPositiva >= 50 ? "Bom" : taxaPositiva >= 30 ? "Regular" : "Baixo"
  const approvalColor =
    taxaPositiva >= 70
      ? "text-primary"
      : taxaPositiva >= 50
      ? "text-chart-4"
      : taxaPositiva >= 30
      ? "text-chart-4"
      : "text-destructive"

  return (
    <div className="flex flex-col gap-6">
      {/* Franchise Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select value={selected} onValueChange={onSelect}>
            <SelectTrigger className="w-[280px] bg-secondary border-border">
              <SelectValue placeholder="Selecione a franquia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Franquias (Consolidado)</SelectItem>
              {franchiseList.map((f) => (
                <SelectItem key={f.code} value={f.code}>
                  {f.code} - {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selected !== "all" && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`size-5 ${approvalColor}`} />
            <span className={`text-sm font-semibold ${approvalColor}`}>
              Aproveitamento: {taxaPositiva.toFixed(1)}% ({approvalLabel})
            </span>
          </div>
        )}
      </div>

      {/* Title Banner */}
      <Card className="overflow-hidden">
        <div className="relative bg-gradient-to-r from-primary/10 to-transparent px-6 py-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-foreground text-balance">
              {selected === "all" ? "Consolidado - Todas as Franquias" : `${current.code} - ${current.name}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {current.total} feedbacks registrados
              {respondidos > 0 && ` | ${respondidos} com resposta de sentimento`}
            </p>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <MetricCard icon={MessageSquare} label="Total" value={current.total} color="text-chart-3" bg="bg-chart-3/10" />
        <MetricCard icon={Send} label="Enviados" value={current.enviados} sub={`${taxaEnvio.toFixed(0)}%`} color="text-chart-3" bg="bg-chart-3/10" />
        <MetricCard icon={TrendingUp} label="Respondidos" value={respondidos} sub={`${taxaResposta.toFixed(0)}%`} color="text-foreground" bg="bg-secondary" />
        <MetricCard icon={ThumbsUp} label="Positivos" value={current.positivos} sub={`${taxaPositiva.toFixed(1)}%`} color="text-primary" bg="bg-primary/10" />
        <MetricCard icon={ThumbsDown} label="Negativos" value={current.negativos} sub={`${taxaNegativa.toFixed(1)}%`} color="text-destructive" bg="bg-destructive/10" />
        <MetricCard icon={MinusCircle} label="Neutros" value={current.neutros} sub={`${taxaNeutra.toFixed(1)}%`} color="text-chart-4" bg="bg-chart-4/10" />
        <MetricCard icon={AlertTriangle} label="Sem Resposta" value={current.semResposta} color="text-muted-foreground" bg="bg-muted" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sentiment Pie */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Distribuicao de Sentimento</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentPie}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {sentimentPie.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...TT}
                    formatter={(value: number, name: string) => {
                      const pct = current.total > 0 ? ((value / current.total) * 100).toFixed(1) : "0"
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
      
        {/* Stacked bar chart by event */}
        {eventBarData.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">Sentimento por Tipo de Evento</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventBarData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.008 260)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "oklch(0.65 0.01 260)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fill: "oklch(0.65 0.01 260)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip {...TT} />
                    <Bar dataKey="Positivos" stackId="a" fill="oklch(0.65 0.19 160)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Negativos" stackId="a" fill="oklch(0.60 0.20 25)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Neutros" stackId="a" fill="oklch(0.75 0.15 80)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Trend Analysis (Replaces Event Approval Breakdown) */}
      <Card>
          <CardContent className="p-5">
             <h3 className="mb-4 text-sm font-medium text-muted-foreground">Evolucao do Aproveitamento (%) por Mes</h3>
             <div className="h-[300px]">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.008 260)" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: "oklch(0.65 0.01 260)", fontSize: 11 }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fill: "oklch(0.65 0.01 260)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip 
                        {...TT} 
                        formatter={(val: number) => [`${val.toFixed(1)}%`, "Aproveitamento"]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="aproveitamento" 
                        stroke="oklch(0.65 0.19 160)" 
                        strokeWidth={2}
                        dot={{ r: 4, fill: "oklch(0.65 0.19 160)" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Dados insuficientes para gerar grafico de tendencia.
                  </div>
                )}
             </div>
          </CardContent>
        </Card>

      {/* Negative Feedbacks Table */}
      <Card>
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ThumbsDown className="size-5 text-destructive" />
            <h3 className="text-base font-semibold">Feedbacks Negativos</h3>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[150px]">Franquia</TableHead>
                <TableHead className="w-[150px]">Evento</TableHead>
                <TableHead>Nome Cliente</TableHead>
                <TableHead className="w-[120px]">Data Evento</TableHead>
                <TableHead className="w-[140px]">Whatsapp</TableHead>
                <TableHead className="w-[200px]">Resolução</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentNegativeRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum feedback negativo encontrado para esta franquia.
                  </TableCell>
                </TableRow>
              ) : (
                currentNegativeRows.map((row, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{row.franquiaNome || row.franquia}</TableCell>
                    <TableCell>{row.evento || "-"}</TableCell>
                    <TableCell>{row.nomeCliente}</TableCell>
                    <TableCell>{row.dataEvento}</TableCell>
                    <TableCell className="font-mono text-xs">{formatPhoneNumber(row.whatsapp)}</TableCell>
                    <TableCell><ResolutionCell row={row} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 p-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="text-sm font-medium">
              Página {currentPage} de {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  sub?: string
  color: string
  bg: string
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
        <div className={`flex size-9 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`size-4 ${color}`} />
        </div>
        <span className={`text-2xl font-bold tabular-nums ${color}`}>
          {value.toLocaleString("pt-BR")}
        </span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
        {sub && <span className="text-[10px] font-medium text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  )
}

function aggregateAll(list: FranchiseData[]): FranchiseData {
  const result: FranchiseData = {
    code: "ALL",
    name: "Todas as Franquias",
    total: 0,
    positivos: 0,
    negativos: 0,
    neutros: 0,
    semResposta: 0,
    enviados: 0,
    eventos: {},
  }

  for (const f of list) {
    result.total += f.total
    result.positivos += f.positivos
    result.negativos += f.negativos
    result.neutros += f.neutros
    result.semResposta += f.semResposta
    result.enviados += f.enviados

    for (const [ev, d] of Object.entries(f.eventos)) {
      if (!result.eventos[ev]) {
        result.eventos[ev] = { total: 0, positivos: 0, negativos: 0, neutros: 0 }
      }
      result.eventos[ev].total += d.total
      result.eventos[ev].positivos += d.positivos
      result.eventos[ev].negativos += d.negativos
      result.eventos[ev].neutros += d.neutros
    }
  }

  return result
}
