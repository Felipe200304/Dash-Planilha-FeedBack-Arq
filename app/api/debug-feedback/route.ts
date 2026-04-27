import { NextResponse } from "next/server"

const SPREADSHEET_ID = "1Ct6G_xxnNU9niOkTIeakVJCTwLdGi9avpmked3E-_aw"

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
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

function normalizeHeaderName(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/["']/g, "").trim().toLowerCase()
}

export async function GET() {
  try {
    const urls = [
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`,
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=0`,
    ]

    let csvText = ""
    let usedUrl = ""

    for (const url of urls) {
      try {
        const response = await fetch(url, { next: { revalidate: 0 } })
        if (response.ok) {
          const text = await response.text()
          if (text && !text.trim().startsWith("<!DOCTYPE") && !text.trim().startsWith("<html")) {
            csvText = text
            usedUrl = url
            break
          }
        }
      } catch { continue }
    }

    if (!csvText) {
      return NextResponse.json({ error: "Não foi possível acessar a planilha" })
    }

    const lines = csvText.split("\n").filter((l) => l.trim() !== "")
    const rawHeaders = parseCSVLine(lines[0])
    const normalizedHeaders = rawHeaders.map(normalizeHeaderName)

    const columnAliases: Record<string, string[]> = {
      franquia: ["franquia", "franchise", "franchisecode", "codigo franquia", "cod franquia", "-="],
      evento: ["evento", "event"],
      nomeCliente: ["nome cliente", "nomecliente", "nome", "cliente", "name"],
      dataEvento: ["data evento", "dataevento", "data_evento"],
      whatsapp: ["whatsapp", "telefone", "phone", "#"],
      dataDisparo: ["data disparo", "datadisparo", "data_disparo"],
      horaDisparo: ["hora disparo", "horadisparo", "hora_disparo", "hora"],
      isPositivo: ["ispositivo", "is_positivo", "positivo"],
      isEnviado: ["isenviado", "is_enviado", "enviado"],
    }

    const colIndex: Record<string, number> = {}
    for (const [field, aliases] of Object.entries(columnAliases)) {
      for (let i = 0; i < normalizedHeaders.length; i++) {
        if (aliases.includes(normalizedHeaders[i])) {
          colIndex[field] = i
          break
        }
      }
    }

    // Sample first 20 data rows
    const sampleRows = lines.slice(1, 21).map((line) => {
      const cols = parseCSVLine(line)
      const row: Record<string, string> = {}
      for (const [field, idx] of Object.entries(colIndex)) {
        row[field] = cols[idx] ?? ""
      }
      row["_raw_isPositivo_col"] = colIndex.isPositivo !== undefined ? (cols[colIndex.isPositivo] ?? "") : "COLUNA NÃO ENCONTRADA"
      row["_raw_franquia_col"] = colIndex.franquia !== undefined ? (cols[colIndex.franquia] ?? "") : (cols[0] ?? "")
      return row
    })

    // Count distinct isPositivo values
    const isPositivoValues: Record<string, number> = {}
    for (const line of lines.slice(1)) {
      const cols = parseCSVLine(line)
      const val = colIndex.isPositivo !== undefined ? (cols[colIndex.isPositivo] ?? "").trim() : "COLUNA NÃO ENCONTRADA"
      isPositivoValues[val] = (isPositivoValues[val] ?? 0) + 1
    }

    // Count distinct franchise values
    const franchiseValues: Record<string, number> = {}
    for (const line of lines.slice(1)) {
      const cols = parseCSVLine(line)
      const val = colIndex.franquia !== undefined ? (cols[colIndex.franquia] ?? cols[0] ?? "").trim() : (cols[0] ?? "").trim()
      franchiseValues[val] = (franchiseValues[val] ?? 0) + 1
    }

    // Per-franchise sentiment breakdown
    const franchiseSentiment: Record<string, { total: number; positive: number; negative: number; neutral: number; empty: number }> = {}
    for (const line of lines.slice(1)) {
      const cols = parseCSVLine(line)
      const fRaw = (colIndex.franquia !== undefined ? (cols[colIndex.franquia] ?? cols[0] ?? "") : (cols[0] ?? "")).trim()
      const sentiment = (colIndex.isPositivo !== undefined ? (cols[colIndex.isPositivo] ?? "") : "").trim().toLowerCase()
      if (!fRaw) continue
      if (!franchiseSentiment[fRaw]) franchiseSentiment[fRaw] = { total: 0, positive: 0, negative: 0, neutral: 0, empty: 0 }
      franchiseSentiment[fRaw].total++
      if (sentiment === "positive" || sentiment === "positve" || sentiment === "true" || sentiment === "positivo") franchiseSentiment[fRaw].positive++
      else if (sentiment === "negative" || sentiment === "false" || sentiment === "negativo") franchiseSentiment[fRaw].negative++
      else if (sentiment === "neutral" || sentiment === "neutro") franchiseSentiment[fRaw].neutral++
      else franchiseSentiment[fRaw].empty++
    }

    return NextResponse.json({
      usedUrl,
      totalRows: lines.length - 1,
      rawHeaders,
      normalizedHeaders,
      detectedColumns: colIndex,
      undetectedColumns: Object.keys(columnAliases).filter((k) => colIndex[k] === undefined),
      isPositivoDistinctValues: isPositivoValues,
      franchiseDistinctValues: franchiseValues,
      franchiseSentimentBreakdown: franchiseSentiment,
      sampleRows,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) })
  }
}
