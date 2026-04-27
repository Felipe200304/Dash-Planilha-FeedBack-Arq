export const FRANCHISE_MAP: Record<string, string> = {
  JOI: "Joinville",
  TST: "Teste Franchise",
  FLN: "Florianopolis",
  BAL: "Balneario Camboriu",
  MGM: "Mogi Mirim",
  ITU: "Itu",
  QGB: "Limeira",
  CTC: "SAC Central",
  MPA: "Pouso Alegre",
  VCP: "Campinas",
  GRU: "Guarulhos",
  OSC: "Osasco SP01",
  SCT: "Sao Caetano SP02",
  STA: "Santos",
  JDI: "Jundiai",
  SOD: "Sorocaba",
  UID: "Uberlandia",
  SJC: "Sao Jose dos Campos",
  RBP: "Ribeirao Preto",
  RJB: "Rio de Janeiro Botafogo",
  VCPL: "Campinas Lanche",
  SCTL: "São Caetano Lanche",
}

const FRANCHISE_ALIAS_TO_CODE: Record<string, string> = {
  joinville: "JOI",
  florianopolis: "FLN",
  "balneario camboriu": "BAL",
  "balneario camburiu": "BAL",
  mogi: "MGM",
  "mogi mirim": "MGM",
  itu: "ITU",
  limeira: "QGB",
  "sac central": "CTC",
  "pouso alegre": "MPA",
  campinas: "VCP",
  guarulhos: "GRU",
  osasco: "OSC",
  "sao caetano": "SCT",
  "sao caetano sp02": "SCT",
  santos: "STA",
  jundiai: "JDI",
  sorocaba: "SOD",
  uberlandia: "UID",
  "sao jose dos campos": "SJC",
  "rio de janeiro": "RJB",
  "rio de janeiro botafogo": "RJB",
  "ribeirao preto": "RBP",
  "campinas lanche": "VCPL",
  "sao paulo lanche": "SCTL",
  "sao caetano lanche": "SCTL",
  "teste franchise": "TST",
}

function normalizeFranchiseAlias(value: string): string {
  return value
    .replace(/^\d+\s*/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function resolveFranchiseCode(value: string): string {
  const raw = String(value || "").trim()
  if (!raw) return ""

  const upper = raw.toUpperCase()
  if (FRANCHISE_MAP[upper]) return upper

  const alias = normalizeFranchiseAlias(raw)
  return FRANCHISE_ALIAS_TO_CODE[alias] || raw
}

export type Sentiment = "positive" | "negative" | "neutral" | null

export type FeedbackRow = {
  franquia: string
  franquiaNome: string
  evento: string
  nomeCliente: string
  dataEvento: string
  whatsapp: string
  dataDisparo: string
  horaDisparo: string
  sentiment: Sentiment
  isEnviado: boolean
}
