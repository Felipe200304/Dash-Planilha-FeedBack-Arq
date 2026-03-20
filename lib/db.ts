import { Pool } from "pg"

declare global {
  var __pgPool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL nao definido")
}

export const db =
  global.__pgPool ??
  new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  })

if (process.env.NODE_ENV !== "production") {
  global.__pgPool = db
}
