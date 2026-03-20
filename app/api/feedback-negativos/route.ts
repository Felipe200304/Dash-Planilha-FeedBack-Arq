import { NextResponse } from "next/server"
import { db } from "@/lib/db"

const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL?.trim() || ""
const SPRING_NEGATIVE_FEEDBACKS_PATH = process.env.SPRING_NEGATIVE_FEEDBACKS_PATH?.trim() || "/feedbacks/negativos"
const SPRING_API_TOKEN = process.env.SPRING_API_TOKEN?.trim() || ""
const SPRING_API_REQUIRED = process.env.SPRING_API_REQUIRED === "true"

type FeedbackNegativoPayload = {
  id?: number
  franquia?: string
  evento?: string
  nomeCliente?: string
  dataEvento?: string
  whatsapp?: string
  resolucao?: string
}

type FeedbackNegativoRow = {
  id: number
  franquia: string
  evento: string
  nomeCliente: string
  dataEvento: string
  whatsapp: string
  resolucao: string
  createdAt?: string
}

function buildSpringUrl(id?: number): string {
  const base = SPRING_API_BASE_URL.replace(/\/+$/, "")
  const path = SPRING_NEGATIVE_FEEDBACKS_PATH.startsWith("/")
    ? SPRING_NEGATIVE_FEEDBACKS_PATH
    : `/${SPRING_NEGATIVE_FEEDBACKS_PATH}`

  if (id) return `${base}${path}/${id}`
  return `${base}${path}`
}

function springHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (SPRING_API_TOKEN) {
    headers.Authorization = `Bearer ${SPRING_API_TOKEN}`
  }

  return headers
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>
  }
  return {}
}

function asString(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return ""
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const n = Number(value)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

function normalizeRow(input: unknown): FeedbackNegativoRow {
  const raw = asRecord(input)

  return {
    id: asNumber(raw.id),
    franquia: asString(raw.franquia),
    evento: asString(raw.evento),
    nomeCliente: asString(raw.nomeCliente ?? raw.nome_cliente),
    dataEvento: asString(raw.dataEvento ?? raw.data_evento),
    whatsapp: asString(raw.whatsapp),
    resolucao: asString(raw.resolucao),
    createdAt: asString(raw.createdAt ?? raw.created_at),
  }
}

function extractRows(payload: unknown): FeedbackNegativoRow[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeRow)
  }

  const data = asRecord(payload)

  if (Array.isArray(data.rows)) {
    return data.rows.map(normalizeRow)
  }

  if (Array.isArray(data.content)) {
    return data.content.map(normalizeRow)
  }

  return []
}

function extractSingleRow(payload: unknown): FeedbackNegativoRow | null {
  const data = asRecord(payload)

  if (data.row) return normalizeRow(data.row)
  if (data.data) return normalizeRow(data.data)
  if (data.id || data.nomeCliente || data.nome_cliente) return normalizeRow(data)

  return null
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

async function callSpring(
  method: "GET" | "POST" | "PUT" | "DELETE",
  options?: { id?: number; body?: Record<string, unknown> }
): Promise<Response | null> {
  if (!SPRING_API_BASE_URL) return null
  if (!SPRING_API_TOKEN) return null

  try {
    return await fetch(buildSpringUrl(options?.id), {
      method,
      headers: springHeaders(),
      body: options?.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    })
  } catch {
    return null
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

    const springResponse = await callSpring("GET")

    if (springResponse) {
      const payload = await readJsonOrText(springResponse)

      if (!springResponse.ok) {
        return NextResponse.json(
          { rows: [], error: asString(asRecord(payload).message) || "Falha ao consultar backend Spring." },
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

    const { rows } = await db.query(
      `
      SELECT
        id,
        franquia,
        evento,
        nome_cliente AS "nomeCliente",
        TO_CHAR(data_evento, 'YYYY-MM-DD') AS "dataEvento",
        whatsapp,
        COALESCE(resolucao, '') AS resolucao,
        created_at AS "createdAt"
      FROM feedbacks_negativos
      ORDER BY created_at DESC, id DESC
      `
    )

    return NextResponse.json({ rows, error: null })
  } catch {
    return NextResponse.json(
      { rows: [], error: "Erro ao carregar feedbacks negativos." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FeedbackNegativoPayload

    if (SPRING_API_REQUIRED && (!SPRING_API_BASE_URL || !SPRING_API_TOKEN)) {
      return NextResponse.json(
        { row: null, error: "Integracao Spring obrigatoria, mas variaveis de ambiente nao estao completas." },
        { status: 500 }
      )
    }

    if (!body.franquia || !body.nomeCliente || !body.dataEvento || !body.whatsapp) {
      return NextResponse.json(
        { error: "Campos obrigatorios: franquia, nomeCliente, dataEvento, whatsapp." },
        { status: 400 }
      )
    }

    const springResponse = await callSpring("POST", {
      body: {
        franquia: body.franquia,
        evento: body.evento ?? "",
        nomeCliente: body.nomeCliente,
        dataEvento: body.dataEvento,
        whatsapp: body.whatsapp,
        resolucao: body.resolucao ?? "",
      },
    })

    if (springResponse) {
      const payload = await readJsonOrText(springResponse)

      if (!springResponse.ok) {
        return NextResponse.json(
          { row: null, error: asString(asRecord(payload).message) || "Falha ao criar no backend Spring." },
          { status: springResponse.status }
        )
      }

      return NextResponse.json(
        { row: extractSingleRow(payload), error: null },
        { status: 201 }
      )
    }

    if (SPRING_API_REQUIRED) {
      return NextResponse.json(
        { row: null, error: "Nao foi possivel conectar ao backend Spring." },
        { status: 502 }
      )
    }

    const { rows } = await db.query(
      `
      INSERT INTO feedbacks_negativos (franquia, evento, nome_cliente, data_evento, whatsapp, resolucao)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        franquia,
        evento,
        nome_cliente AS "nomeCliente",
        TO_CHAR(data_evento, 'YYYY-MM-DD') AS "dataEvento",
        whatsapp,
        COALESCE(resolucao, '') AS resolucao,
        created_at AS "createdAt"
      `,
      [
        body.franquia,
        body.evento ?? "",
        body.nomeCliente,
        body.dataEvento,
        body.whatsapp,
        body.resolucao ?? "",
      ]
    )

    return NextResponse.json({ row: rows[0], error: null }, { status: 201 })
  } catch {
    return NextResponse.json(
      { row: null, error: "Erro ao criar feedback negativo." },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as FeedbackNegativoPayload

    if (SPRING_API_REQUIRED && (!SPRING_API_BASE_URL || !SPRING_API_TOKEN)) {
      return NextResponse.json(
        { row: null, error: "Integracao Spring obrigatoria, mas variaveis de ambiente nao estao completas." },
        { status: 500 }
      )
    }

    if (!body.id) {
      return NextResponse.json({ error: "id obrigatorio para atualizar." }, { status: 400 })
    }

    const springResponse = await callSpring("PUT", {
      id: body.id,
      body: {
        franquia: body.franquia,
        evento: body.evento,
        nomeCliente: body.nomeCliente,
        dataEvento: body.dataEvento,
        whatsapp: body.whatsapp,
        resolucao: body.resolucao,
      },
    })

    if (springResponse) {
      const payload = await readJsonOrText(springResponse)

      if (!springResponse.ok) {
        return NextResponse.json(
          { row: null, error: asString(asRecord(payload).message) || "Falha ao atualizar no backend Spring." },
          { status: springResponse.status }
        )
      }

      return NextResponse.json({ row: extractSingleRow(payload), error: null })
    }

    if (SPRING_API_REQUIRED) {
      return NextResponse.json(
        { row: null, error: "Nao foi possivel conectar ao backend Spring." },
        { status: 502 }
      )
    }

    const existing = await db.query(
      `SELECT id FROM feedbacks_negativos WHERE id = $1`,
      [body.id]
    )

    if (existing.rowCount === 0) {
      return NextResponse.json({ error: "Registro nao encontrado." }, { status: 404 })
    }

    const { rows } = await db.query(
      `
      UPDATE feedbacks_negativos
      SET
        franquia = COALESCE($1, franquia),
        evento = COALESCE($2, evento),
        nome_cliente = COALESCE($3, nome_cliente),
        data_evento = COALESCE($4::date, data_evento),
        whatsapp = COALESCE($5, whatsapp),
        resolucao = COALESCE($6, resolucao)
      WHERE id = $7
      RETURNING
        id,
        franquia,
        evento,
        nome_cliente AS "nomeCliente",
        TO_CHAR(data_evento, 'YYYY-MM-DD') AS "dataEvento",
        whatsapp,
        COALESCE(resolucao, '') AS resolucao,
        created_at AS "createdAt"
      `,
      [
        body.franquia ?? null,
        body.evento ?? null,
        body.nomeCliente ?? null,
        body.dataEvento ?? null,
        body.whatsapp ?? null,
        body.resolucao ?? null,
        body.id,
      ]
    )

    return NextResponse.json({ row: rows[0], error: null })
  } catch {
    return NextResponse.json(
      { row: null, error: "Erro ao atualizar feedback negativo." },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    if (SPRING_API_REQUIRED && (!SPRING_API_BASE_URL || !SPRING_API_TOKEN)) {
      return NextResponse.json(
        { ok: false, error: "Integracao Spring obrigatoria, mas variaveis de ambiente nao estao completas." },
        { status: 500 }
      )
    }

    const id = Number(searchParams.get("id"))

    if (!id) {
      return NextResponse.json({ error: "id obrigatorio para excluir." }, { status: 400 })
    }

    const springResponse = await callSpring("DELETE", { id })

    if (springResponse) {
      const payload = await readJsonOrText(springResponse)

      if (!springResponse.ok) {
        return NextResponse.json(
          { ok: false, error: asString(asRecord(payload).message) || "Falha ao excluir no backend Spring." },
          { status: springResponse.status }
        )
      }

      return NextResponse.json({ ok: true, error: null })
    }

    if (SPRING_API_REQUIRED) {
      return NextResponse.json(
        { ok: false, error: "Nao foi possivel conectar ao backend Spring." },
        { status: 502 }
      )
    }

    const result = await db.query("DELETE FROM feedbacks_negativos WHERE id = $1", [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Registro nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ ok: true, error: null })
  } catch {
    return NextResponse.json({ ok: false, error: "Erro ao excluir feedback negativo." }, { status: 500 })
  }
}
