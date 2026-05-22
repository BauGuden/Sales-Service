import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateSalesSchemaAndCoreTables1763052000000
  implements MigrationInterface
{
  name = 'CreateSalesSchemaAndCoreTables1763052000000';

  private readonly schema = 'sales';
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
}
