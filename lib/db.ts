import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { DB } from "./db.d";

// Validate required environment variables
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const nodeEnv = process.env.NODE_ENV || "development";
const pgSslMode = process.env.PGSSLMODE;

const globalForDb = globalThis as unknown as { mainPool?: Pool };

function getPool() {
  if (!globalForDb.mainPool)
    globalForDb.mainPool = new Pool({
      application_name: "github-analytics",
      connectionString: databaseUrl,
      max: 1, // Maximum number of clients in the pool
      idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection can't be established
      ssl:
        pgSslMode === "disable"
          ? false
          : nodeEnv === "production"
          ? { rejectUnauthorized: pgSslMode === "require" }
          : false,
    });
  return globalForDb.mainPool;
}

const dialect = new PostgresDialect({
  pool: getPool(),
});

export const db = new Kysely<DB>({ dialect });
