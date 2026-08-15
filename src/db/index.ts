import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite";
import { join } from "node:path";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __recapAiPostgresqlPool?: Pool;
  __recapAiPglite?: PGlite;
};

// Lazy pool for real PostgreSQL. Creating a Pool does not open a connection,
// which lets Next.js inspect route modules during `next build` without
// requiring runtime credentials.
export const pool = databaseUrl
  ? (globalForDb.__recapAiPostgresqlPool ??
    new Pool(databaseUrl ? { connectionString: databaseUrl } : undefined))
  : null;

if (pool && process.env.NODE_ENV !== "production") {
  globalForDb.__recapAiPostgresqlPool = pool;
}

/**
 * Local / sandbox fallback database.
 *
 * When DATABASE_URL is not set (e.g. the Arena preview sandbox, which has no
 * external PostgreSQL server), run on an embedded Postgres (PGlite) so every
 * page and API still works out of the box. Production deployments always set
 * DATABASE_URL, so they use real PostgreSQL and never touch this path.
 *
 * `new PGlite()` is synchronous and queues commands until the WASM database is
 * ready, so we can safely enqueue the DDL (before any query) at module load.
 */
const LOCAL_DDL = `
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "value_encrypted" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "api_keys_name_unique" UNIQUE("name")
);
CREATE TABLE IF NOT EXISTS "recaps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "file_name" text NOT NULL,
  "file_size" bigint NOT NULL,
  "duration_sec" integer NOT NULL,
  "frame_count" integer DEFAULT 0 NOT NULL,
  "model" text DEFAULT 'gemini-3.7-flash' NOT NULL,
  "title" text,
  "script" text,
  "status" text DEFAULT 'processing' NOT NULL,
  "error" text,
  "is_public" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
`;

function createClient() {
  if (databaseUrl) {
    // Real PostgreSQL (production).
    return pgDrizzle(pool as Pool);
  }

  // Embedded Postgres fallback (local / sandbox). Persist to a gitignored
  // directory so data survives dev-server restarts.
  let pglite = globalForDb.__recapAiPglite;
  if (!pglite) {
    pglite = new PGlite({
      dataDir: join(process.cwd(), ".local-dev", "pglite"),
    });
    globalForDb.__recapAiPglite = pglite;
    // Queued before any query, so tables are ready by first use.
    void pglite.exec(LOCAL_DDL);
  }
  return pgliteDrizzle(pglite, { schema });
}

const client = createClient();

// Both drizzle adapters expose the same query-builder surface used across the
// app (`select`, `insert`, `update`, `delete`, `returning`, `rowCount`).
// Annotate with the node-postgres database type so all call sites (which were
// written against real PostgreSQL) type-check regardless of the active adapter.
export const db = client as ReturnType<typeof pgDrizzle>;
