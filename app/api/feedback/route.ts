import { NextResponse } from "next/server"
import { FRANCHISE_MAP, type FeedbackRow, type Sentiment } from "@/lib/franchises"

const SPREADSHEET_ID = "1Ct6G_xxnNU9niOkTIeakVJCTwLdGi9avpmked3E-_aw"

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseSentiment(value: string): Sentiment {
  const v = value.toLowerCase().trim()
  if (v === "positive" || v === "true" || v === "positivo") return "positive"
  if (v === "negative" || v === "false" || v === "negativo") return "negative"
  if (v === "neutral" || v === "neutro") return "neutral"
  return null
}

function parseBoolean(value: string): boolean {
  const v = value.toUpperCase().trim()
  return v === "TRUE"
}

export async function GET() {
  try {
    const urls = [
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=0`,
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`,
    ]

    let csvText = ""
    let success = false

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          next: { revalidate: 0 },
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Cache-Control": "no-cache",
          },
        })

        if (response.ok) {
          const text = await response.text()
          if (text && !text.trim().startsWith("<!DOCTYPE") && !text.trim().startsWith("<html")) {
            csvText = text
            success = true
            break
          }
        }
      } catch {
        continue
      }
    }

    if (!success) {
      return NextResponse.json(
        {
          error: "Nao foi possivel acessar a planilha. Verifique se ela esta compartilhada como 'Qualquer pessoa com o link'.",
          rows: [],
        },
        { status: 400 }
      )
    }

    const lines = csvText.split("\n").filter((line) => line.trim() !== "")

    if (lines.length < 2) {
      return NextResponse.json({ rows: [], error: null })
    }

    // Parse header row to find column indexes dynamically
    const headerCols = parseCSVLine(lines[0]).map((h) => h.replace(/"/g, "").trim().toLowerCase())

    const colIndex: Record<string, number> = {}
    const columnAliases: Record<string, string[]> = {
      franquia: ["franquia", "franchise", "franchisecode"],
      evento: ["evento", "event"],
      nomeCliente: ["nome cliente", "nomecliente", "nome", "cliente", "name"],
      dataEvento: ["data evento", "dataevento", "data_evento"],
      whatsapp: ["whatsapp", "telefone", "phone", "#"],
      dataDisparo: ["data disparo", "datadisparo", "data_disparo"],
      horaDisparo: ["hora disparo", "horadisparo", "hora_disparo", "hora"],
      isPositivo: ["ispositivo", "is_positivo", "positivo"],
      isEnviado: ["isenviado", "is_enviado", "enviado"],
    }

    for (const [field, aliases] of Object.entries(columnAliases)) {
      for (let i = 0; i < headerCols.length; i++) {
        if (aliases.includes(headerCols[i])) {
          colIndex[field] = i
          break
        }
      }
    }

    const dataRows = lines.slice(1)

    function getCol(cols: string[], field: string): string {
      const idx = colIndex[field]
      if (idx === undefined) return ""
      return (cols[idx] || "").replace(/"/g, "").trim()
    }

    const rows: FeedbackRow[] = dataRows.map((line) => {
      const cols = parseCSVLine(line)
      const franquiaCode = getCol(cols, "franquia")

      return {
        franquia: franquiaCode,
        franquiaNome: FRANCHISE_MAP[franquiaCode] || franquiaCode,
        evento: getCol(cols, "evento"),
        nomeCliente: getCol(cols, "nomeCliente"),
        dataEvento: getCol(cols, "dataEvento"),
        whatsapp: getCol(cols, "whatsapp"),
        dataDisparo: getCol(cols, "dataDisparo"),
        horaDisparo: getCol(cols, "horaDisparo"),
        sentiment: parseSentiment(getCol(cols, "isPositivo")),
        isEnviado: parseBoolean(getCol(cols, "isEnviado")),
      }
    })

    return NextResponse.json({ rows, error: null })
  } catch {
    return NextResponse.json(
      {
        error: "Erro ao buscar dados da planilha. Verifique a conexao.",
        rows: [],
      },
      { status: 500 }
    )
  }
}
