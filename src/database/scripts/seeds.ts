import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dbEnvs } from 'src/config';
import dataSource from '../data-source';
import { runSeeder } from 'typeorm-extension';
import { ensureSchemaExists } from '../utils/ensure-schema';
import MainSeeder from '../seeds/seed';
import { GROUPS, PARAMETER, PRODUCTS } from '../seeds/seed-data';
import {
  Group,
  Parameter,
  Product,
  Sale,
  SaleProduct,
} from '../../sales/entities';

type Command = 'create' | 'run' | 'revert';

const command = process.argv[2] as Command | undefined;

const toPascalCase = (value: string) =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

const createSeeder = () => {
  const rawName = process.argv[3]?.trim();

  if (!rawName) {
    console.error('Debes enviar un nombre. Ejemplo: pnpm seed:create init-sales');
    process.exit(1);
  }

  const seedsDir = resolve(process.cwd(), 'src/database/seeds');
  mkdirSync(seedsDir, { recursive: true });

  const normalizedName = rawName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const timestamp = Date.now();
  const className = `${toPascalCase(normalizedName)}Seeder${timestamp}`;
  const filePath = resolve(seedsDir, `${timestamp}-${normalizedName}.ts`);
  const template = `import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export default class ${className} implements Seeder {
  public async run(
    _dataSource: DataSource,
    _factoryManager: SeederFactoryManager,
  ): Promise<void> {
    // Implementa aqui tu seeder.
  }
}
`;

  writeFileSync(filePath, template, 'utf8');
  console.log(`Seeder creado en ${filePath}`);
};

const runMainSeeder = async () => {
  await ensureSchemaExists();
  await dataSource.initialize();

  try {
    await runSeeder(dataSource, MainSeeder, { seedTracking: false });

    const groupRepo = dataSource.getRepository(Group);
    const productRepo = dataSource.getRepository(Product);
    const parameterRepo = dataSource.getRepository(Parameter);

    const [groups, products, parameters] = await Promise.all([
      groupRepo.count(),
      productRepo.count(),
      parameterRepo.count(),
    ]);

    console.log(
      `Seed completado. groups=${groups}, products=${products}, parameters=${parameters}`,
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
};

const revertMainSeeder = async () => {
  await ensureSchemaExists();
  await dataSource.initialize();

  try {
    const saleRepo = dataSource.getRepository(Sale);
    const saleProductRepo = dataSource.getRepository(SaleProduct);
    const groupRepo = dataSource.getRepository(Group);
    const productRepo = dataSource.getRepository(Product);
    const parameterRepo = dataSource.getRepository(Parameter);

    const [salesCount, saleProductsCount] = await Promise.all([
      saleRepo.count(),
      saleProductRepo.count(),
    ]);

    if (salesCount > 0 || saleProductsCount > 0) {
      console.error(
        'No se puede revertir el seed base porque existen ventas o detalles de venta relacionados.',
      );
      process.exit(1);
    }

    await dataSource.transaction(async (manager) => {
      const schema = dbEnvs.dbSchema;
      const productCodes = PRODUCTS.map((product) => product.code);
      const groupNames = GROUPS.map((group) => group.name);

      await manager.query(
        `DELETE FROM "${schema}"."products" WHERE "code" = ANY($1)`,
        [productCodes],
      );

      await manager.query(
        `DELETE FROM "${schema}"."groups" WHERE "name" = ANY($1)`,
        [groupNames],
      );

      await manager.query(
        `DELETE FROM "${schema}"."parameters"
         WHERE "id" = $1
            OR ("max_amount" = $2 AND "max_products" = $3)`,
        [PARAMETER.id, PARAMETER.maxAmount, PARAMETER.maxProducts],
      );

      const seedTable = await manager.query(
        'SELECT to_regclass($1) AS table_name',
        [`${schema}.seeds`],
      );

      if (seedTable[0]?.table_name) {
        await manager.query(
          `DELETE FROM "${schema}"."seeds" WHERE "name" = $1`,
          ['MainSeeder'],
        );
      }
    });

    const [groups, products, parameters] = await Promise.all([
      groupRepo.count(),
      productRepo.count(),
      parameterRepo.count(),
    ]);

    console.log(
      `Seed revertido. groups=${groups}, products=${products}, parameters=${parameters}`,
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
};

const runCommand = async () => {
  switch (command) {
    case 'create':
      createSeeder();
      return;
    case 'run':
      await runMainSeeder();
      return;
    case 'revert':
      await revertMainSeeder();
      return;
    default:
      console.error('Comando invalido. Usa: create, run o revert.');
      process.exit(1);
  }
};

void runCommand();
