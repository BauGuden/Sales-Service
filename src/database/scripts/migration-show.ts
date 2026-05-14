import { ensureSchemaExists } from '../utils/ensure-schema';
import { runTypeormCommand } from './run-typeorm-command';

void (async () => {
  await ensureSchemaExists();
  runTypeormCommand(['migration:show', '-d', 'src/database/data-source.ts']);
})();
