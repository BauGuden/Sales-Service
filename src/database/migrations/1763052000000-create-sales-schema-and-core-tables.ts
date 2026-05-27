import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { dbEnvs } from 'src/config';

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

export class CreateSalesSchemaAndCoreTables1763052000000
  implements MigrationInterface
{
  name = 'CreateSalesSchemaAndCoreTables1763052000000';

  private readonly schema = dbEnvs.dbSchema;
  private readonly saleStateEnumName = 'sale_state_enum';
  private readonly saleStateEnumPath = `"${this.schema}"."${this.saleStateEnumName}"`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createSchema(this.schema, true);

    await queryRunner.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = '${this.saleStateEnumName}'
            AND n.nspname = '${this.schema}'
        ) THEN
          CREATE TYPE ${this.saleStateEnumPath} AS ENUM (
            'GENERATED',
            'PAID',
            'CANCELLED',
            'PAYMENT_ERROR'
          );
        END IF;
      END $$;`,
    );

    if (!(await queryRunner.hasTable(`${this.schema}.groups`))) {
      await queryRunner.createTable(
        new Table({
          schema: this.schema,
          name: 'groups',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'name',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'account_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'shortened',
              type: 'varchar',
              length: '10',
              isNullable: false,
              isUnique: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'deleted_at',
              type: 'timestamp',
              isNullable: true,
            },
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable(`${this.schema}.parameters`))) {
      await queryRunner.createTable(
        new Table({
          schema: this.schema,
          name: 'parameters',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'max_amount',
              type: 'decimal',
              precision: 10,
              scale: 2,
              default: '0',
              isNullable: false,
            },
            {
              name: 'max_products',
              type: 'int',
              default: '1',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'deleted_at',
              type: 'timestamp',
              isNullable: true,
            },
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable(`${this.schema}.products`))) {
      await queryRunner.createTable(
        new Table({
          schema: this.schema,
          name: 'products',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'name',
              type: 'varchar',
              length: '150',
              isNullable: false,
            },
            {
              name: 'code',
              type: 'varchar',
              length: '20',
              isNullable: false,
              isUnique: true,
            },
            {
              name: 'price',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'is_active',
              type: 'boolean',
              default: true,
              isNullable: false,
            },
            {
              name: 'group_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'deleted_at',
              type: 'timestamp',
              isNullable: true,
            },
          ],
        }),
      );

      await queryRunner.createForeignKey(
        `${this.schema}.products`,
        new TableForeignKey({
          columnNames: ['group_id'],
          referencedSchema: this.schema,
          referencedTableName: 'groups',
          referencedColumnNames: ['id'],
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
        }),
      );
    }

    if (!(await queryRunner.hasTable(`${this.schema}.sales`))) {
      await queryRunner.createTable(
        new Table({
          schema: this.schema,
          name: 'sales',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'code',
              type: 'varchar',
              length: '20',
              isNullable: false,
              isUnique: true,
            },
            {
              name: 'customer',
              type: 'varchar',
              length: '150',
              isNullable: false,
            },
            {
              name: 'identity_card',
              type: 'varchar',
              length: '20',
              isNullable: false,
            },
            {
              name: 'date',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'state',
              type: this.saleStateEnumPath,
              default: `'GENERATED'`,
              isNullable: false,
            },
            {
              name: 'payment_location_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'payment_type_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'total',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'transaccion_id',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'parameter_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'deleted_at',
              type: 'timestamp',
              isNullable: true,
            },
          ],
        }),
      );

      await queryRunner.createForeignKey(
        `${this.schema}.sales`,
        new TableForeignKey({
          columnNames: ['parameter_id'],
          referencedSchema: this.schema,
          referencedTableName: 'parameters',
          referencedColumnNames: ['id'],
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
        }),
      );
    }

    if (!(await queryRunner.hasTable(`${this.schema}.sale_products`))) {
      await queryRunner.createTable(
        new Table({
          schema: this.schema,
          name: 'sale_products',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'product_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'name',
              type: 'varchar',
              length: '150',
              isNullable: false,
            },
            {
              name: 'folder_number',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'voucher_number',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'receipt_date',
              type: 'date',
              isNullable: true,
            },
            {
              name: 'price',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'amount',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'total',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'sale_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'deleted_at',
              type: 'timestamp',
              isNullable: true,
            },
          ],
        }),
      );

      await queryRunner.createForeignKeys(`${this.schema}.sale_products`, [
        new TableForeignKey({
          columnNames: ['product_id'],
          referencedSchema: this.schema,
          referencedTableName: 'products',
          referencedColumnNames: ['id'],
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
        }),
        new TableForeignKey({
          columnNames: ['sale_id'],
          referencedSchema: this.schema,
          referencedTableName: 'sales',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'NO ACTION',
        }),
      ]);
    }

    await this.seedCatalogs(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(`${this.schema}.sale_products`)) {
      await queryRunner.dropTable(`${this.schema}.sale_products`, true, true, true);
    }

    if (await queryRunner.hasTable(`${this.schema}.sales`)) {
      await queryRunner.dropTable(`${this.schema}.sales`, true, true, true);
    }

    if (await queryRunner.hasTable(`${this.schema}.products`)) {
      await queryRunner.dropTable(`${this.schema}.products`, true, true, true);
    }

    if (await queryRunner.hasTable(`${this.schema}.parameters`)) {
      await queryRunner.dropTable(`${this.schema}.parameters`, true, true, true);
    }

    if (await queryRunner.hasTable(`${this.schema}.groups`)) {
      await queryRunner.dropTable(`${this.schema}.groups`, true, true, true);
    }

    await queryRunner.query(`DROP TYPE IF EXISTS ${this.saleStateEnumPath}`);
  }

  private async seedCatalogs(queryRunner: QueryRunner): Promise<void> {
    for (const group of GROUPS) {
      await queryRunner.query(
        `INSERT INTO "${this.schema}"."groups" ("id", "name", "shortened", "account_id")
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
      await queryRunner.query(
        `INSERT INTO "${this.schema}"."products" (
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
        [product.id, product.name, product.code, product.price, true, product.groupId],
      );
    }

    await queryRunner.query(
      `DELETE FROM "${this.schema}"."groups"
       WHERE "id" = ANY($1)`,
      [[3, 4, 5]],
    );

    await queryRunner.query(
      `INSERT INTO "${this.schema}"."parameters" ("id", "max_amount", "max_products")
       VALUES ($1, $2, $3)
       ON CONFLICT ("id")
       DO UPDATE SET
         "max_amount" = EXCLUDED."max_amount",
         "max_products" = EXCLUDED."max_products"`,
      [PARAMETER.id, PARAMETER.maxAmount, PARAMETER.maxProducts],
    );

    await this.syncSequence(queryRunner, 'groups');
    await this.syncSequence(queryRunner, 'products');
    await this.syncSequence(queryRunner, 'parameters');
  }

  private async syncSequence(queryRunner: QueryRunner, tableName: string) {
    await queryRunner.query(
      `SELECT setval(
        pg_get_serial_sequence('"${this.schema}"."${tableName}"', 'id'),
        COALESCE((SELECT MAX("id") FROM "${this.schema}"."${tableName}"), 1),
        true
      )`,
    );
  }
}
