import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'app.db')

let dbInstance: ReturnType<typeof drizzle> | null = null

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function getDb() {
  if (dbInstance) return dbInstance

  ensureDataDir()
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  dbInstance = drizzle(sqlite, { schema })

  // Run migrations
  const migrationsPath = path.join(process.cwd(), 'lib/db/migrations')
  if (fs.existsSync(migrationsPath)) {
    migrate(dbInstance, { migrationsFolder: migrationsPath })
  }

  return dbInstance
}
