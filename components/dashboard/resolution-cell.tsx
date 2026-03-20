"use client"

import { useEffect, useMemo, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Flag, CheckCircle2, Clock, LoaderCircle } from "lucide-react"
import type { FeedbackRow } from "@/lib/franchises"

type ResolutionStatus = "unresolved" | "in_progress" | "resolved"

function normalizeDateForRequest(value: string): string {
  const raw = String(value || "").trim()
  if (!raw) return ""

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const day = slash[1].padStart(2, "0")
    const month = slash[2].padStart(2, "0")
    const year = slash[3]
    return `${year}-${month}-${day}`
  }

  return raw
}

const statusConfig: Record<ResolutionStatus, { label: string; flagClass: string; badgeClass: string; Icon: React.ElementType }> = {
  unresolved: {
    label: "Nao Resolvido",
    flagClass: "text-red-500",
    badgeClass: "bg-red-500/15 text-red-600 border-red-400/40",
    Icon: Flag,
  },
  in_progress: {
    label: "Em Andamento",
    flagClass: "text-yellow-500",
    badgeClass: "bg-yellow-500/15 text-yellow-600 border-yellow-400/40",
    Icon: Clock,
  },
  resolved: {
    label: "Resolvido",
    flagClass: "text-green-500",
    badgeClass: "bg-green-500/15 text-green-600 border-green-400/40",
    Icon: CheckCircle2,
  },
}

export function ResolutionCell({
  row,
  resolution,
  onSaved,
}: {
  row: FeedbackRow
  resolution?: string
  onSaved?: () => void
}) {
  const statusStorageKey = useMemo(() => {
    const key = [row.franquia, row.evento, row.nomeCliente, row.dataEvento, row.whatsapp]
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|")
    return `feedback_resolution_status:${key}`
  }, [row.dataEvento, row.evento, row.franquia, row.nomeCliente, row.whatsapp])

  const [value, setValue] = useState(resolution || "")
  const [savedValue, setSavedValue] = useState(resolution || "")
  const [status, setStatus] = useState<ResolutionStatus>(
    resolution && resolution.trim().length > 0 ? "in_progress" : "unresolved"
  )
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { label, flagClass, badgeClass, Icon } = statusConfig[status]

  useEffect(() => {
    setValue(resolution || "")
    setSavedValue(resolution || "")

    const persistedStatus = localStorage.getItem(statusStorageKey) as ResolutionStatus | null
    if (persistedStatus === "resolved" || persistedStatus === "in_progress" || persistedStatus === "unresolved") {
      setStatus(persistedStatus)
      return
    }

    if (resolution && resolution.trim().length > 0) {
      setStatus("in_progress")
    } else {
      setStatus("unresolved")
    }
  }, [resolution, statusStorageKey])

  const persistResolution = async (nextStatus: ResolutionStatus) => {
    const response = await fetch("/api/feedback-negativos/resolucoes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        franquia: row.franquia,
        evento: row.evento,
        nomeCliente: row.nomeCliente,
          dataEvento: normalizeDateForRequest(row.dataEvento),
        whatsapp: row.whatsapp,
        resolucao: value,
      }),
    })

    if (!response.ok) {
      throw new Error("Falha ao salvar resolucao")
    }

    setSavedValue(value)
    setStatus(nextStatus)
    localStorage.setItem(statusStorageKey, nextStatus)
    onSaved?.()
  }

  const handleSave = async (nextStatus: ResolutionStatus) => {
    try {
      setSaving(true)
      await persistResolution(nextStatus)
      setOpen(false)
    } catch {
      // Mantem a UX simples; em caso de erro, o usuario pode tentar novamente.
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !saving && value !== savedValue) {
      const draftStatus: ResolutionStatus = value.trim().length > 0 ? "in_progress" : "unresolved"
      void (async () => {
        try {
          await persistResolution(draftStatus)
        } catch {
          // Se falhar no autosave, mantemos somente a mudanca local visual.
        }
      })()
    }

    setOpen(nextOpen)
  }

  const handleMarkInProgress = () => {
    setStatus("in_progress")
    localStorage.setItem(statusStorageKey, "in_progress")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-start gap-2 px-2 text-xs font-normal hover:bg-muted/40"
        >
          <Flag className={`size-3.5 shrink-0 fill-current ${flagClass}`} />
          {value ? (
            <span className="truncate max-w-[130px] text-foreground">{value}</span>
          ) : (
            <span className="italic text-muted-foreground/60">{label}</span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Resolucao do Feedback
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
              <Icon className="size-3" />
              {label}
            </span>
          </DialogTitle>
          <DialogDescription>
            {row.nomeCliente} - {row.franquiaNome || row.franquia}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Descreva detalhadamente como o feedback foi tratado e resolvido..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-[180px] resize-none"
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex shrink-0 gap-2 ml-auto">
              {status === "resolved" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkInProgress}
                  disabled={saving}
                  className="text-yellow-600 border-yellow-400/50 hover:bg-yellow-50"
                >
                  <Clock className="size-3.5 mr-1" />
                  Em andamento
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave("in_progress")}
                disabled={saving}
                className="border-yellow-500 bg-yellow-400 text-yellow-950 hover:bg-yellow-500"
              >
                {saving ? <LoaderCircle className="size-3.5 mr-1 animate-spin" /> : <Clock className="size-3.5 mr-1" />}
                Salvar andamento
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave("resolved")}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? <LoaderCircle className="size-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="size-3.5 mr-1" />}
                Concluido
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
