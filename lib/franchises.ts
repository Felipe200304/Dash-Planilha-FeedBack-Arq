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
  "São Paulo Lanche": "Lanche de São Paulo",
  "Campinas Lanche": "Lanche de Campinas",
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
