import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Group, Parameter, Product } from '../../sales/entities';
import { GROUPS, PARAMETER, PRODUCTS } from './seed-data';

export default class MainSeeder implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const groupMetadata = dataSource.getMetadata(Group);
    const productMetadata = dataSource.getMetadata(Product);
    const parameterMetadata = dataSource.getMetadata(Parameter);
    const schema = groupMetadata.schema ?? 'sales';

    for (const group of GROUPS) {
      await dataSource.query(
        `INSERT INTO "${schema}"."${groupMetadata.tableName}" ("id", "name", "account_id")
         VALUES ($1, $2, $3)
         ON CONFLICT ("id")
         DO UPDATE SET
           "name" = EXCLUDED."name",
           "account_id" = EXCLUDED."account_id"`,
        [group.id, group.name, group.accountId],
      );
    }

    for (const product of PRODUCTS) {
      await dataSource.query(
        `INSERT INTO "${schema}"."${productMetadata.tableName}" (
          "name",
          "code",
          "price",
          "is_active",
          "group_id"
        )
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("code")
         DO UPDATE SET
           "name" = EXCLUDED."name",
           "price" = EXCLUDED."price",
           "is_active" = EXCLUDED."is_active",
           "group_id" = EXCLUDED."group_id"`,
        [product.name, product.code, product.price, true, product.groupId],
      );
    }

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
