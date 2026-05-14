import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export function runTypeormCommand(args: string[]) {
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
}
