import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema.ts";

export interface DatabaseClientOptions {
  readonly applicationName?: string;
  readonly maxConnections?: number;
}

export type Database = NodePgDatabase<typeof schema>;
export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

export interface DatabaseClient {
  readonly db: Database;
  readonly pool: Pool;
  close(): Promise<void>;
}

export function createDatabaseClient(
  connectionString: string,
  options: DatabaseClientOptions = {},
): DatabaseClient {
  const poolConfig: PoolConfig = {
    application_name: options.applicationName ?? "lingo-pilot",
    connectionString,
    max: options.maxConnections ?? 10,
    options: "-c timezone=UTC",
  };
  const pool = new Pool(poolConfig);
  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    close: () => pool.end(),
  };
}

export function withTransaction<T>(
  database: Database,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return database.transaction(operation);
}
