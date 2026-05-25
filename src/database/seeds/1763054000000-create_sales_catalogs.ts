import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { Group, Parameter, Product } from '../../sales/entities';

const GROUPS = [
  { id: 1, name: 'gastos administrativos', shortened: 'GA', accountId: 1 },
  { id: 2, name: 'folders', shortened: 'FO', accountId: 1 },
] as const;

const PRODUCTS = [
  {
    id: 1,
    name: 'Folder Complemento Económico',
    code: 'F-CE',
    price: 25,
    groupId: 2,
  },
  { id: 2, name: 'Folder Fondo de Retiro', code: 'F-FR', price: 25, groupId: 2 },
  { id: 3, name: 'Folder Cuota Mortuoria', code: 'F-CM', price: 25, groupId: 2 },
  { id: 4, name: 'Folder Auxilio Mortuorio', code: 'F-AM', price: 25, groupId: 2 },
  {
    id: 5,
    name: 'Folder Préstamos Sector Activo',
    code: 'F-PA',
    price: 25,
    groupId: 1,
  },
  {
    id: 6,
    name: 'Folder Préstamos Sector Pasivo',
    code: 'F-PP',
    price: 15,
    groupId: 1,
  },
] as const;

const PARAMETER = {
  id: 1,
  maxAmount: 1,
  maxProducts: 1,
} as const;

export class CreateSalesCatalogs1763054000000 implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<void> {
    const groupMetadata = dataSource.getMetadata(Group);
    const productMetadata = dataSource.getMetadata(Product);
    const parameterMetadata = dataSource.getMetadata(Parameter);
    const schema = groupMetadata.schema ?? 'sales';

    for (const group of GROUPS) {
      await dataSource.query(
        `INSERT INTO "${schema}"."${groupMetadata.tableName}" ("id", "name", "shortened", "account_id")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("id")
         DO UPDATE SET
           "name" = EXCLUDED."name",
           "shortened" = EXCLUDED."shortened",
           "account_id" = EXCLUDED."account_id"`,
        [group.id, group.name, group.shortened, group.accountId],
      );
    }

    for (const product of PRODUCTS) {
      await dataSource.query(
        `INSERT INTO "${schema}"."${productMetadata.tableName}" (
          "id",
          "name",
          "code",
          "price",
          "is_active",
          "group_id"
        )
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ("id")
         DO UPDATE SET
           "name" = EXCLUDED."name",
           "code" = EXCLUDED."code",
           "price" = EXCLUDED."price",
           "is_active" = EXCLUDED."is_active",
           "group_id" = EXCLUDED."group_id"`,
        [
          product.id,
          product.name,
          product.code,
          product.price,
          true,
          product.groupId,
        ],
      );
    }

    await dataSource.query(
      `DELETE FROM "${schema}"."${groupMetadata.tableName}"
       WHERE "id" = ANY($1)`,
      [[3, 4, 5]],
    );

    await dataSource.query(
      `INSERT INTO "${schema}"."${parameterMetadata.tableName}" (
        "id",
        "max_amount",
        "max_products"
      )
       VALUES ($1, $2, $3)
       ON CONFLICT ("id")
       DO UPDATE SET
         "max_amount" = EXCLUDED."max_amount",
         "max_products" = EXCLUDED."max_products"`,
      [PARAMETER.id, PARAMETER.maxAmount, PARAMETER.maxProducts],
    );

    await this.syncSequence(dataSource, Group);
    await this.syncSequence(dataSource, Product);
    await this.syncSequence(dataSource, Parameter);
  }

  private async syncSequence(
    dataSource: DataSource,
    entity: typeof Group | typeof Product | typeof Parameter,
  ) {
    const metadata = dataSource.getMetadata(entity);
    const schema = metadata.schema;
    const tableName = metadata.tableName;
    const primaryColumn = metadata.primaryColumns[0]?.databaseName;

    if (!schema || !primaryColumn) {
      return;
    }

    await dataSource.query(
      `SELECT setval(
        pg_get_serial_sequence('"${schema}"."${tableName}"', '${primaryColumn}'),
        COALESCE((SELECT MAX("${primaryColumn}") FROM "${schema}"."${tableName}"), 1),
        true
      )`,
    );
  }
}
