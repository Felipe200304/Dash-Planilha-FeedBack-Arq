import { NextResponse } from "next/server"
import { db } from "@/lib/db"

const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL?.trim() || ""
const SPRING_NEGATIVE_FEEDBACKS_PATH = process.env.SPRING_NEGATIVE_FEEDBACKS_PATH?.trim() || "/feedbacks/negativos"
const SPRING_API_TOKEN = process.env.SPRING_API_TOKEN?.trim() || ""
const SPRING_API_REQUIRED = process.env.SPRING_API_REQUIRED === "true"

type ResolutionPayload = {
  franquia?: string
  evento?: string
  nomeCliente?: string
  dataEvento?: string
  whatsapp?: string
  resolucao?: string
}

type ResolutionRow = {
  franquia: string
  evento: string
  nomeCliente: string
  dataEvento: string
  whatsapp: string
  resolucao: string
  updatedAt?: string
}

function normalizeText(value: string | undefined): string {
  return (value || "").trim()
}

function normalizeWhatsapp(value: string | undefined): string {
  return (value || "").replace(/\D/g, "")
}

function buildSpringResolutionsUrl(): string {
  const base = SPRING_API_BASE_URL.replace(/\/+$/, "")
  const path = SPRING_NEGATIVE_FEEDBACKS_PATH.startsWith("/")
    ? SPRING_NEGATIVE_FEEDBACKS_PATH
    : `/${SPRING_NEGATIVE_FEEDBACKS_PATH}`
  return `${base}${path}/resolucoes`
}

function buildSpringResolutionUrl(): string {
  const base = SPRING_API_BASE_URL.replace(/\/+$/, "")
  const path = SPRING_NEGATIVE_FEEDBACKS_PATH.startsWith("/")
    ? SPRING_NEGATIVE_FEEDBACKS_PATH
    : `/${SPRING_NEGATIVE_FEEDBACKS_PATH}`
  return `${base}${path}/resolucao`
}

function springHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (SPRING_API_TOKEN) {
    headers.Authorization = `Bearer ${SPRING_API_TOKEN}`
  }

  return headers
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>
  return {}
}

function asString(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return ""
}

function normalizeResolutionRow(input: unknown): ResolutionRow {
  const raw = asRecord(input)
  return {
    franquia: asString(raw.franquia),
    evento: asString(raw.evento),
    nomeCliente: asString(raw.nomeCliente ?? raw.nome_cliente),
    dataEvento: asString(raw.dataEvento ?? raw.data_evento),
    whatsapp: asString(raw.whatsapp),
    resolucao: asString(raw.resolucao),
    updatedAt: asString(raw.updatedAt ?? raw.updated_at),
  }
}

function extractRows(payload: unknown): ResolutionRow[] {
  if (Array.isArray(payload)) return payload.map(normalizeResolutionRow)
  const data = asRecord(payload)
  if (Array.isArray(data.rows)) return data.rows.map(normalizeResolutionRow)
  if (Array.isArray(data.content)) return data.content.map(normalizeResolutionRow)
  return []
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

export async function GET() {
  try {
    if (SPRING_API_REQUIRED && (!SPRING_API_BASE_URL || !SPRING_API_TOKEN)) {
      return NextResponse.json(
        { rows: [], error: "Integracao Spring obrigatoria, mas variaveis de ambiente nao estao completas." },
        { status: 500 }
      )
    }

    if (SPRING_API_BASE_URL && SPRING_API_TOKEN) {
      const springResponse = await fetch(buildSpringResolutionsUrl(), {
        method: "GET",
        headers: springHeaders(),
        cache: "no-store",
      }).catch(() => null)

      if (springResponse) {
        const payload = await readJsonOrText(springResponse)
        if (!springResponse.ok) {
          return NextResponse.json(
            { rows: [], error: asString(asRecord(payload).message) || "Falha ao consultar resolucoes no backend Spring." },
            { status: springResponse.status }
          )
        }

        return NextResponse.json({ rows: extractRows(payload), error: null })
      }

      if (SPRING_API_REQUIRED) {
        return NextResponse.json(
          { rows: [], error: "Nao foi possivel conectar ao backend Spring." },
          { status: 502 }
        )
      }
    }

    const { rows } = await db.query(
      `
      SELECT
        franquia,
        evento,
        nome_cliente AS "nomeCliente",
        TO_CHAR(data_evento, 'YYYY-MM-DD') AS "dataEvento",
        whatsapp,
        COALESCE(resolucao, '') AS resolucao,
        updated_at AS "updatedAt"
      FROM feedbacks_negativos
      WHERE resolucao IS NOT NULL
      ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
      `
    )

    return NextResponse.json({ rows, error: null })
  } catch {
    return NextResponse.json(
      { rows: [], error: "Erro ao carregar resolucoes." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResolutionPayload

    if (SPRING_API_REQUIRED && (!SPRING_API_BASE_URL || !SPRING_API_TOKEN)) {
      return NextResponse.json(
        { row: null, error: "Integracao Spring obrigatoria, mas variaveis de ambiente nao estao completas." },
        { status: 500 }
      )
    }

    if (!body.franquia || !body.evento || !body.nomeCliente || !body.dataEvento || !body.whatsapp) {
      return NextResponse.json(
        { row: null, error: "Campos obrigatorios: franquia, evento, nomeCliente, dataEvento, whatsapp." },
        { status: 400 }
      )
    }

    if (SPRING_API_BASE_URL && SPRING_API_TOKEN) {
      const springResponse = await fetch(buildSpringResolutionUrl(), {
        method: "POST",
        headers: springHeaders(),
        body: JSON.stringify({
          franquia: normalizeText(body.franquia),
          evento: normalizeText(body.evento),
          nomeCliente: normalizeText(body.nomeCliente),
          dataEvento: normalizeText(body.dataEvento),
          whatsapp: normalizeWhatsapp(body.whatsapp),
          resolucao: normalizeText(body.resolucao),
        }),
        cache: "no-store",
      }).catch(() => null)

      if (springResponse) {
        const payload = await readJsonOrText(springResponse)
        if (!springResponse.ok) {
          return NextResponse.json(
            { row: null, error: asString(asRecord(payload).message) || "Falha ao salvar resolucao no backend Spring." },
            { status: springResponse.status }
          )
        }

        return NextResponse.json({ row: normalizeResolutionRow(payload), error: null })
      }

      if (SPRING_API_REQUIRED) {
        return NextResponse.json(
          { row: null, error: "Nao foi possivel conectar ao backend Spring." },
          { status: 502 }
        )
      }
    }

    const franquia = normalizeText(body.franquia)
    const evento = normalizeText(body.evento)
    const nomeCliente = normalizeText(body.nomeCliente)
    const dataEvento = normalizeText(body.dataEvento)
    const whatsapp = normalizeWhatsapp(body.whatsapp)
    const resolucao = normalizeText(body.resolucao)

    const existing = await db.query(
      `
      SELECT id
      FROM feedbacks_negativos
      WHERE
        franquia = $1
        AND evento = $2
        AND nome_cliente = $3
        AND data_evento = $4::date
        AND whatsapp = $5
      ORDER BY id DESC
      LIMIT 1
      `,
      [franquia, evento, nomeCliente, dataEvento, whatsapp]
    )

    if (existing.rowCount && existing.rows[0]?.id) {
      const { rows } = await db.query(
        `
        UPDATE feedbacks_negativos
        SET resolucao = COALESCE($1, '')
        WHERE id = $2
        RETURNING
          id,
          franquia,
          evento,
          nome_cliente AS "nomeCliente",
          TO_CHAR(data_evento, 'YYYY-MM-DD') AS "dataEvento",
          whatsapp,
          COALESCE(resolucao, '') AS resolucao
        `,
        [resolucao, existing.rows[0].id]
      )

      return NextResponse.json({ row: rows[0], error: null })
    }

    const { rows } = await db.query(
      `
      INSERT INTO feedbacks_negativos (franquia, evento, nome_cliente, data_evento, whatsapp, resolucao)
      VALUES ($1, $2, $3, $4::date, $5, $6)
      RETURNING
        id,
        franquia,
        evento,
        nome_cliente AS "nomeCliente",
        TO_CHAR(data_evento, 'YYYY-MM-DD') AS "dataEvento",
        whatsapp,
        COALESCE(resolucao, '') AS resolucao
      `,
      [
        franquia,
        evento,
        nomeCliente,
        dataEvento,
        whatsapp,
        resolucao,
      ]
    )

    return NextResponse.json({ row: rows[0], error: null }, { status: 201 })
  } catch {
    return NextResponse.json(
      { row: null, error: "Erro ao salvar resolucao." },
      { status: 500 }
    )
  }
}
