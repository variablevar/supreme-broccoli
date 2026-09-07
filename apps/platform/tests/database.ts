import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
export async function database() {
  const url = process.env.TEST_DATABASE_URL;
  if (url && new URL(url).pathname !== "/imo_test")
    throw new Error(
      "TEST_DATABASE_URL must target an isolated database named imo_test",
    );
  const pool = url ? new Pool({ connectionString: url, max: 5 }) : null;
  const memory = pool ? null : new PGlite();
  if (memory)
    await memory.exec(
      "create role anon; create role authenticated; create role service_role;",
    );
  const schema = "imo_test_" + randomUUID().replaceAll("-", "");
  const sql = (q: string) => q.replace(/\bimo\b/g, schema);
  const db = {
    async exec(q: string) {
      if (pool) await pool.query(sql(q));
      else await memory!.exec(sql(q));
    },
    async query<T = Record<string, unknown>>(
      q: string,
      args: unknown[] = [],
    ): Promise<{ rows: T[] }> {
      if (pool)
        return (await pool.query(sql(q), args)) as unknown as { rows: T[] };
      return await memory!.query<T>(sql(q), args);
    },
    async close() {
      if (pool) {
        await pool.query(`drop schema ${schema} cascade`);
        await pool.end();
      } else await memory!.close();
    },
  };
  for (const file of [
    "001_identity.sql",
    "002_accounts.sql",
    "003_devices.sql",
    "005_registration_applications.sql",
    "006_device_presence_window.sql",
    "007_bulk_device_publications.sql",
    "008_online_device_rewards.sql",
    "009_login_security_and_email_domain.sql",
  ])
    await db.exec(
      await readFile(
        new URL("../../../database/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  return db;
}
