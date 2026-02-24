"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import type { FeedbackRow, Sentiment } from "@/lib/franchises"
import { FRANCHISE_MAP } from "@/lib/franchises"
import { DashboardHeader } from "./dashboard-header"
import { OverviewTab } from "./overview-tab"
import { FranchisePage } from "./franchise-page"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select"
import { AlertCircle, LayoutDashboard, Building2, Calendar } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null

  if (dateStr.includes("/")) {
    const p = dateStr.split("/") 
    if (p.length === 3) {
      let year = Number(p[2])
      
      if (year < 100) year += 2000
      
      const date = new Date(year, Number(p[1]) - 1, Number(p[0]))
      
      if (date.getFullYear() < 2020) return null
      
      
      if (date > new Date(new Date().setMonth(new Date().getMonth() + 1))) return null; 
      
      return date
    }
  }  
  
  const d = new Date(dateStr)
  if (d.getFullYear() < 2020) return null
  if (d > new Date(new Date().setMonth(new Date().getMonth() + 1))) return null;
  return isNaN(d.getTime()) ? null : d
}

function countSentiment(rows: FeedbackRow[], s: Sentiment) {
  return rows.filter((r) => r.sentiment === s).length
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "franchise">("overview")
  const [selectedFranchise, setSelectedFranchise] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")

  const { data, error, isLoading, mutate, isValidating } = useSWR<{
    rows: FeedbackRow[]
    error: string | null
  }>("/api/feedback", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  const lastUpdated = useMemo(() => {
    if (!data) return null
    return new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    
  }, [data])

  const rows = data?.rows ?? []

  
  const months = useMemo(() => {
    const m = new Set<string>()
    for (const row of rows) {
      const d = parseDate(row.dataEvento || row.dataDisparo)
      if (d) {
        m.add(format(d, "MMM/yyyy", { locale: ptBR }))
      }
    }
    
    return Array.from(m).sort((a, b) => {
        
        const da = parse(a, "MMM/yyyy", new Date(), { locale: ptBR })
        const db = parse(b, "MMM/yyyy", new Date(), { locale: ptBR })
        return db.getTime() - da.getTime() 
    })
  }, [rows])

  
  const filteredRows = useMemo(() => {
    if (selectedMonth === "all") return rows
    
    return rows.filter((r) => {
        const d = parseDate(r.dataEvento || r.dataDisparo)
        if (!d) return false
        const m = format(d, "MMM/yyyy", { locale: ptBR })
        
        return m.toLowerCase() === selectedMonth.toLowerCase()
    })
  }, [rows, selectedMonth])

  
  const globalStats = useMemo(() => {
    const total = filteredRows.length
    const positivos = countSentiment(filteredRows, "positive")
    const negativos = countSentiment(filteredRows, "negative")
    const neutros = countSentiment(filteredRows, "neutral")
    const semResposta = filteredRows.filter((r) => r.sentiment === null).length
    const respondidos = positivos + negativos + neutros
    const enviados = filteredRows.filter((r) => r.isEnviado).length
    const franquias = new Set(filteredRows.map((r) => r.franquia)).size

    return {
      total,
      positivos,
      negativos,
      neutros,
      semResposta,
      respondidos,
      enviados,
      franquias,
      positivePercent: respondidos > 0 ? (positivos / respondidos) * 100 : 0,
      negativePercent: respondidos > 0 ? (negativos / respondidos) * 100 : 0,
      neutralPercent: respondidos > 0 ? (neutros / respondidos) * 100 : 0,
    }
  }, [filteredRows])

  
  const franchiseMap = useMemo(() => {
    const map = new Map<
      string,
      {
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
    >()

    
    
    for (const row of rows) {
          if (!row.franquia || !row.franquia.trim()) continue
          let fKey = row.franquia
          
          if (fKey === "Joinville") fKey = "JOI"
          if (fKey === "Mogi") fKey = "MGM"
          if (fKey === "Sorocaba") fKey = "SOD"
          if (fKey === "Itu") fKey = "ITU"
          if (fKey === "Pouso Alegre") fKey = "MPA"
          if (fKey === "Santos") fKey = "STA"
          if (fKey === "Uberlândia" || fKey === "Uberlandia") fKey = "UID"
          if (fKey === "Guarulhos") fKey = "GRU"
          if (fKey === "São Caetano" || fKey === "Sao Caetano") fKey = "SCT"
          if (fKey === "Osasco") fKey = "OSC"
          if (fKey === "Rio de Janeiro") fKey = "RJB"
          if (fKey === "Jundiaí" || fKey === "Jundiai") fKey = "JDI"
          if (fKey === "Limeira") fKey = "QGB"
          if (fKey === "Ribeirão Preto" || fKey === "Ribeirao Preto") fKey = "RBP"
          if (fKey === "SJC" || fKey === "São José dos Campos") fKey = "SJC" 
          
          if (fKey === "São Paulo Lanche") fKey = "SCTL"
          if (fKey === "Campinas Lanche") fKey = "VCPL"
          if (fKey === "Campinas") fKey = "VCP"

          if (!map.has(fKey)) {
            map.set(fKey, {
              code: fKey,
              name: FRANCHISE_MAP[fKey] || fKey,
              total: 0,
              positivos: 0,
              negativos: 0,
              neutros: 0,
              semResposta: 0,
              enviados: 0,
              eventos: {},
            })
          }
    }

    
    for (const row of filteredRows) {
      if (!row.franquia || !row.franquia.trim()) continue
      
      let franchiseKey = row.franquia
      
      
      if (franchiseKey === "Joinville") franchiseKey = "JOI"
      if (franchiseKey === "Mogi") franchiseKey = "MGM"
      if (franchiseKey === "Sorocaba") franchiseKey = "SOD"
      if (franchiseKey === "Itu") franchiseKey = "ITU"
      if (franchiseKey === "Pouso Alegre") franchiseKey = "MPA"
      if (franchiseKey === "Santos") franchiseKey = "STA"
      if (franchiseKey === "Uberlândia" || franchiseKey === "Uberlandia") franchiseKey = "UID"
      if (franchiseKey === "Guarulhos") franchiseKey = "GRU"
      if (franchiseKey === "São Caetano" || franchiseKey === "Sao Caetano") franchiseKey = "SCT"
      if (franchiseKey === "Osasco") franchiseKey = "OSC"
      if (franchiseKey === "Rio de Janeiro") franchiseKey = "RJB"
      if (franchiseKey === "Jundiaí" || franchiseKey === "Jundiai") franchiseKey = "JDI"
      if (franchiseKey === "Limeira") franchiseKey = "QGB"
      if (franchiseKey === "Ribeirão Preto" || franchiseKey === "Ribeirao Preto") franchiseKey = "RBP"
      if (franchiseKey === "SJC" || franchiseKey === "São José dos Campos") franchiseKey = "SJC" 

      
      if (franchiseKey === "São Paulo Lanche") franchiseKey = "SCTL" 
      if (franchiseKey === "Campinas Lanche") franchiseKey = "VCPL" 
      
      if (franchiseKey === "Campinas") franchiseKey = "VCP"

      if (!map.has(franchiseKey)) {
        
        map.set(franchiseKey, {
          code: franchiseKey,
          name: FRANCHISE_MAP[franchiseKey] || franchiseKey,
          total: 0,
          positivos: 0,
          negativos: 0,
          neutros: 0,
          semResposta: 0,
          enviados: 0,
          eventos: {},
        })
      }
      const f = map.get(franchiseKey)!
      f.total++
      if (row.isEnviado) f.enviados++
      if (row.sentiment === "positive") f.positivos++
      else if (row.sentiment === "negative") f.negativos++
      else if (row.sentiment === "neutral") f.neutros++
      else f.semResposta++

      if (row.evento) {
        if (!f.eventos[row.evento]) {
          f.eventos[row.evento] = { total: 0, positivos: 0, negativos: 0, neutros: 0 }
        }
        f.eventos[row.evento].total++
        if (row.sentiment === "positive") f.eventos[row.evento].positivos++
        else if (row.sentiment === "negative") f.eventos[row.evento].negativos++
        else if (row.sentiment === "neutral") f.eventos[row.evento].neutros++
      }
    }

    return map
  }, [rows, filteredRows]) 

  const franchiseList = useMemo(() => {
    
    return Array.from(franchiseMap.values()).sort((a, b) => b.total - a.total)
  }, [franchiseMap])

  if (isLoading) return <DashboardSkeleton />

  if (error || data?.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
        <Card className="border-destructive/30 max-w-lg w-full">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertCircle className="size-10 text-destructive" />
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-foreground">Erro ao carregar dados</h3>
              <p className="text-sm text-muted-foreground">
                {data?.error || "Nao foi possivel conectar a planilha."}
              </p>
              <div className="mt-3 rounded-lg bg-secondary p-4 text-left text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Como corrigir:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Abra a planilha no Google Sheets</li>
                  <li>{"Clique em Compartilhar (canto superior direito)"}</li>
                  <li>{"Em 'Acesso geral', mude para 'Qualquer pessoa com o link'"}</li>
                  <li>{"Certifique-se de que a funcao e 'Leitor'"}</li>
                  <li>Volte aqui e clique em Tentar Novamente</li>
                </ol>
              </div>
              <button
                onClick={() => mutate()}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Tentar Novamente
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const tabs = [
    { id: "overview" as const, label: "Visao Geral", icon: LayoutDashboard },
    { id: "franchise" as const, label: "Por Franquia", icon: Building2 },
  ]

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-background p-4 md:p-6 lg:p-8">
      <DashboardHeader
        onRefresh={() => mutate()}
        isRefreshing={isValidating}
        lastUpdated={lastUpdated}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        
        <div className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>

        
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] bg-secondary border-border h-10">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeTab === "overview" ? (
        <OverviewTab
          stats={globalStats}
          franchiseList={franchiseList}
        />
      ) : (
        <FranchisePage
          franchiseList={franchiseList}
          selected={selectedFranchise}
          onSelect={setSelectedFranchise}
          rows={filteredRows}
        />
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-background p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-64 rounded-lg" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-[400px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </div>
  )
}
