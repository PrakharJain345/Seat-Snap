import { Pool, PoolClient } from "pg";
import { logger } from "./logger.js";

export function createPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    logger.error({ err }, "Unexpected error on idle PostgreSQL client");
  });

  return pool;
}

export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      logger.error({ rollbackErr }, "Error rolling back transaction");
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function runMigration(
  pool: Pool,
  schema: string,
  migrationSql: string,
  version = "001_init"
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const { rows } = await client.query(
      `SELECT version FROM ${schema}.schema_migrations WHERE version = $1;`,
      [version]
    );

    if (rows.length === 0) {
      logger.info({ schema, version }, "Applying database migration");
      await client.query("BEGIN");
      await client.query(migrationSql);
      await client.query(
        `INSERT INTO ${schema}.schema_migrations (version) VALUES ($1);`,
        [version]
      );
      await client.query("COMMIT");
      logger.info({ schema, version }, "Migration applied successfully");
    } else {
      logger.debug({ schema, version }, "Migration already applied");
    }
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    logger.error({ err, schema, version }, "Failed to apply migration");
    throw err;
  } finally {
    client.release();
  }
}
