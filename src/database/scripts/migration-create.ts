import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { runTypeormCommand } from './run-typeorm-command';

const rawName = process.argv[2]?.trim();

if (!rawName) {
  console.error('Debes enviar un nombre. Ejemplo: pnpm migration:create init-sales');
  process.exit(1);
}

const migrationsDir = resolve(process.cwd(), 'src/database/migrations');
mkdirSync(migrationsDir, { recursive: true });

const normalizedName = rawName
  .replace(/\s+/g, '-')
  .replace(/[^a-zA-Z0-9-_]/g, '')
  .replace(/-+/g, '-');

runTypeormCommand(['migration:create', `src/database/migrations/${normalizedName}`]);
