import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ensureSchemaExists } from '../utils/ensure-schema';

type Command = 'create' | 'show' | 'run' | 'revert';

const command = process.argv[2] as Command | undefined;

const runTypeormCommand = (args: string[]) => {
  const cliPath = resolve(process.cwd(), 'node_modules/typeorm/cli.js');
  const result = spawnSync(
    process.execPath,
    ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', cliPath, ...args],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
    },
  );

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  process.exit(1);
};

const createMigration = () => {
  const rawName = process.argv[3]?.trim();

  if (!rawName) {
    console.error(
      'Debes enviar un nombre. Ejemplo: pnpm migration:create init-sales',
    );
    process.exit(1);
  }

  const migrationsDir = resolve(process.cwd(), 'src/database/migrations');
  mkdirSync(migrationsDir, { recursive: true });

  const normalizedName = rawName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .replace(/-+/g, '-');

  runTypeormCommand([
    'migration:create',
    `src/database/migrations/${normalizedName}`,
  ]);
};

const runCommand = async () => {
  switch (command) {
    case 'create':
      createMigration();
      return;
    case 'show':
    case 'run':
    case 'revert':
      await ensureSchemaExists();
      runTypeormCommand([
        `migration:${command}`,
        '-d',
        'src/database/data-source.ts',
      ]);
      return;
    default:
      console.error(
        'Comando inválido. Usa: create, show, run o revert.',
      );
      process.exit(1);
  }
};

void runCommand();
