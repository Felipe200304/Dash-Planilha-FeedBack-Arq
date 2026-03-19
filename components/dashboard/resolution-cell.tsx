"use client"

import { useState, useEffect } from "react"
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
import { FileText, Pencil, Flag, CheckCircle2, Clock } from "lucide-react"
import type { FeedbackRow } from "@/lib/franchises"

type ResolutionStatus = "unresolved" | "in_progress" | "resolved"

function generateKey(row: FeedbackRow) {
  return `resolution_${row.franquia}_${row.dataEvento}_${row.whatsapp}_${row.nomeCliente}_${row.evento}_${row.dataDisparo}_${row.horaDisparo}`.replace(/\s+/g, '')
}

function getStatus(text: string, resolved: boolean): ResolutionStatus {
  if (resolved) return "resolved"
  if (text.trim().length > 0) return "in_progress"
  return "unresolved"
}

const statusConfig: Record<ResolutionStatus, { label: string; flagClass: string; badgeClass: string; Icon: React.ElementType }> = {
  unresolved: {
    label: "Não Resolvido",
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

export function ResolutionCell({ row }: { row: FeedbackRow }) {
  const [value, setValue] = useState("")
  const [isResolved, setIsResolved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const storageKey = generateKey(row)
  const statusKey = `${storageKey}_status`

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    const savedStatus = localStorage.getItem(statusKey)
    setValue(saved || "")
    setIsResolved(savedStatus === "resolved")
    setLoading(false)
  }, [storageKey, statusKey])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    localStorage.setItem(storageKey, newValue)
    // If cleared, reset resolved state
    if (newValue.trim().length === 0) {
      setIsResolved(false)
      localStorage.removeItem(statusKey)
    }
  }

  const handleMarkResolved = () => {
    setIsResolved(true)
    localStorage.setItem(statusKey, "resolved")
    setOpen(false)
  }

  const handleMarkInProgress = () => {
    setIsResolved(false)
    localStorage.removeItem(statusKey)
  }

  if (loading) return <div className="h-8 w-24 animate-pulse rounded bg-muted/20" />

  const status = getStatus(value, isResolved)
  const { label, flagClass, badgeClass, Icon } = statusConfig[status]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            Resolução do Feedback
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
              <Icon className="size-3" />
              {label}
            </span>
          </DialogTitle>
          <DialogDescription>
            {row.nomeCliente} — {row.franquiaNome || row.franquia}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Descreva detalhadamente como o feedback foi tratado e resolvido..."
            value={value}
            onChange={handleChange}
            className="min-h-[180px] resize-none"
          />

          <div className="flex items-center justify-between gap-2">
            {status === "in_progress" && (
              <p className="text-xs text-muted-foreground">
                Preencha a resolução e marque como resolvido quando concluir.
              </p>
            )}
            {status === "resolved" && (
              <p className="text-xs text-green-600">
                ✓ Este feedback foi marcado como resolvido.
              </p>
            )}
            {status === "unresolved" && (
              <p className="text-xs text-muted-foreground">
                Adicione uma descrição para registrar o andamento.
              </p>
            )}

            <div className="flex shrink-0 gap-2 ml-auto">
              {status === "resolved" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkInProgress}
                  className="text-yellow-600 border-yellow-400/50 hover:bg-yellow-50"
                >
                  <Clock className="size-3.5 mr-1" />
                  Reabrir
                </Button>
              )}
              {status !== "resolved" && value.trim().length > 0 && (
                <Button
                  size="sm"
                  onClick={handleMarkResolved}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="size-3.5 mr-1" />
                  Marcar como Resolvido
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
