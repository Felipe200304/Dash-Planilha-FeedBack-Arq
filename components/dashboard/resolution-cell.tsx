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
import { FileText, Pencil } from "lucide-react"
import type { FeedbackRow } from "@/lib/franchises"

function generateKey(row: FeedbackRow) {
  return `resolution_${row.franquia}_${row.dataEvento}_${row.whatsapp}_${row.nomeCliente}`.replace(/\s+/g, '')
}

export function ResolutionCell({ row }: { row: FeedbackRow }) {
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  
  const storageKey = generateKey(row)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      setValue(saved)
    }
    setLoading(false)
  }, [storageKey])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    localStorage.setItem(storageKey, newValue)
  }

  if (loading) return <div className="h-8 w-24 animate-pulse rounded bg-muted/20" />

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 w-full justify-start gap-2 px-2 text-xs font-normal ${value ? "text-foreground" : "text-muted-foreground/50 hover:text-foreground"}`}
        >
          {value ? (
            <>
              <FileText className="size-3.5 shrink-0" />
              <span className="truncate max-w-[150px]">{value}</span>
            </>
          ) : (
            <>
              <Pencil className="size-3.5 shrink-0" />
              <span className="italic">Adicionar resolucao...</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Resolucao do Feedback</DialogTitle>
          <DialogDescription>
             Detalhes do cliente: {row.nomeCliente} ({row.franquiaNome || row.franquia})
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Descreva detalhadamente como o feedback foi tratado e resolvido..."
            value={value}
            onChange={handleChange}
            className="min-h-[200px] resize-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
