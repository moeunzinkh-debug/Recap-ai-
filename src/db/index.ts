import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __recapAiPostgresqlPool?: Pool;
};

// Creating a Pool does not open a connection. Keeping initialization lazy lets
// Next.js inspect route modules during `next build` without requiring runtime
// credentials. The proxy below still gives a clear error before the first query.
export const pool =
  globalForDb.__recapAiPostgresqlPool ??
  new Pool(databaseUrl ? { connectionString: databaseUrl } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__recapAiPostgresqlPool = pool;
}

const drizzleClient = drizzle(pool);

export const db: typeof drizzleClient = new Proxy(drizzleClient, {
  get(target, property, receiver) {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    return Reflect.get(target, property, receiver);
  },
});
