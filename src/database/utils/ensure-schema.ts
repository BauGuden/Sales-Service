import { Client } from 'pg';
import { dbEnvs } from 'src/config';

const escapeIdentifier = (value: string) => `"${value.replace(/"/g, '""')}"`;

export async function ensureSchemaExists() {
  const client = new Client({
    host: dbEnvs.dbHost,
    port: dbEnvs.dbPort,
    database: dbEnvs.dbDatabase,
    user: dbEnvs.dbUsername,
    password: dbEnvs.dbPassword,
  });

  await client.connect();

  try {
    await client.query(
      `CREATE SCHEMA IF NOT EXISTS ${escapeIdentifier(dbEnvs.dbSchema)}`,
    );
  } finally {
    await client.end();
  }
}
