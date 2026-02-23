"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type DashboardHeaderProps = {
  onRefresh: () => void
  isRefreshing: boolean
  lastUpdated: string | null
}

export function DashboardHeader({
  onRefresh,
  isRefreshing,
  lastUpdated,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
          Dashboard de Feedbacks
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhamento em tempo real dos feedbacks das franquias
          {lastUpdated && (
            <span className="ml-2 text-xs text-muted-foreground/60">
              | Atualizado: {lastUpdated}
            </span>
          )}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="border-border bg-secondary gap-2 w-fit"
      >
        <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
        Atualizar
      </Button>
    </header>
  )
}
