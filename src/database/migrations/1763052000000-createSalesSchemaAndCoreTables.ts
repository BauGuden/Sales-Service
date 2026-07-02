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
  {
    id: 2,
    name: 'Folder Fondo de Retiro',
    code: 'F-FR',
    price: 25,
    groupId: 2,
  },
  {
    id: 3,
    name: 'Folder Cuota Mortuoria',
    code: 'F-CM',
    price: 25,
    groupId: 2,
  },
  {
    id: 4,
    name: 'Folder Auxilio Mortuorio',
    code: 'F-AM',
    price: 25,
    groupId: 2,
  },
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

const PAYMENT_TYPES = [
  { id: 1, name: 'Efectivo', description: 'Pago personal', shortened: 'EF' },
  { id: 2, name: 'Código QR', description: 'Código por QR', shortened: 'QR' },
  {
    id: 3,
    name: 'Depósito',
    description: 'Depósito Bancario',
    shortened: 'DEP',
  },
  {
    id: 4,
    name: 'Transferencia',
    description: 'Transferencia entre Bancos',
    shortened: 'TRANSF',
  },
] as const;

const PARAMETER = {
  id: 1,
  maxAmountProduct: 1,
  maxProducts: 1,
  currencySymbol: 'bs',
  isActive: true,
} as const;

export class CreateSalesSchemaAndCoreTables1763052000000 implements MigrationInterface {
  name = 'CreateSalesSchemaAndCoreTables1763052000000';

  private readonly schema = dbEnvs.dbSchema;
  private readonly saleStateEnumName = 'sale_state_enum';
  private readonly saleStateEnumPath = `"${this.schema}"."${this.saleStateEnumName}"`;
  private readonly paymentTypeStateEnumName = 'payment_type_state_enum';
  private readonly paymentTypeStateEnumPath = `"${this.schema}"."${this.paymentTypeStateEnumName}"`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createSchema(this.schema, true);
    await this.createSaleStateEnum(queryRunner);
    await this.createPaymentTypeStateEnum(queryRunner);
    await this.createGroupsTable(queryRunner);
    await this.createParametersTable(queryRunner);
    await this.createProductsTable(queryRunner);
    await this.createPaymentTypesTable(queryRunner);
    await this.createSalesTable(queryRunner);
    await this.createVouchersTable(queryRunner);
    await this.createQrPaymentsTable(queryRunner);
    await this.createSaleProductsTable(queryRunner);
    await this.seedCatalogs(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(`${this.schema}.sale_products`)) {
      await queryRunner.dropTable(
        `${this.schema}.sale_products`,
        true,
        true,
        true,
      );
    }

    if (await queryRunner.hasTable(`${this.schema}.qr_payments_sales`)) {
      await queryRunner.dropTable(
        `${this.schema}.qr_payments_sales`,
        true,
        true,
        true,
      );
    }

    if (await queryRunner.hasTable(`${this.schema}.vouchers`)) {
      await queryRunner.dropTable(`${this.schema}.vouchers`, true, true, true);
    }

    if (await queryRunner.hasTable(`${this.schema}.sales`)) {
      await queryRunner.dropTable(`${this.schema}.sales`, true, true, true);
    }

    if (await queryRunner.hasTable(`${this.schema}.payment_types`)) {
      await queryRunner.dropTable(
        `${this.schema}.payment_types`,
        true,
        true,
        true,
      );
    }

    if (await queryRunner.hasTable(`${this.schema}.products`)) {
      await queryRunner.dropTable(`${this.schema}.products`, true, true, true);
    }

    if (await queryRunner.hasTable(`${this.schema}.parameters`)) {
      await queryRunner.dropTable(
        `${this.schema}.parameters`,
        true,
        true,
        true,
      );
    }

    if (await queryRunner.hasTable(`${this.schema}.groups`)) {
      await queryRunner.dropTable(`${this.schema}.groups`, true, true, true);
    }

    await queryRunner.query(
      `DROP TYPE IF EXISTS ${this.paymentTypeStateEnumPath}`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS ${this.saleStateEnumPath}`);
  }

  private async createSaleStateEnum(queryRunner: QueryRunner): Promise<void> {
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
            'VIGENTE',
            'PENDIENTE',
            'ANULADO'
          );
        END IF;
      END $$;`,
    );
  }

  private async createPaymentTypeStateEnum(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = '${this.paymentTypeStateEnumName}'
            AND n.nspname = '${this.schema}'
        ) THEN
          CREATE TYPE ${this.paymentTypeStateEnumPath} AS ENUM (
            'PAGADO',
            'GENERADO',
            'RECHAZADO'
          );
        END IF;
      END $$;`,
    );
  }

  private async createGroupsTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(`${this.schema}.groups`)) {
      return;
    }

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
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
    );
  }

  private async createParametersTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(`${this.schema}.parameters`)) {
      return;
    }

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
            name: 'max_amount_product',
            type: 'int',
            default: '1',
            isNullable: false,
          },
          {
            name: 'max_products',
            type: 'int',
            default: '1',
            isNullable: false,
          },
          {
            name: 'currency_symbol',
            type: 'varchar',
            length: '4',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
    );
  }

  private async createProductsTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(`${this.schema}.products`)) {
      return;
    }

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
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
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

  private async createPaymentTypesTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (await queryRunner.hasTable(`${this.schema}.payment_types`)) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        schema: this.schema,
        name: 'payment_types',
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
            name: 'description',
            type: 'varchar',
            length: '255',
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
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
    );
  }

  private async createSalesTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(`${this.schema}.sales`)) {
      return;
    }

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
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'sale_state',
            type: this.saleStateEnumPath,
            default: `'PENDIENTE'::${this.saleStateEnumPath}`,
            isNullable: false,
          },
          {
            name: 'person_uuid',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'date',
            type: 'timestamptz',
            default: 'now()',
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
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys(`${this.schema}.sales`, [
      new TableForeignKey({
        columnNames: ['parameter_id'],
        referencedSchema: this.schema,
        referencedTableName: 'parameters',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    ]);
  }

  private async createVouchersTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(`${this.schema}.vouchers`)) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        schema: this.schema,
        name: 'vouchers',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'sale_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'customer',
            type: 'varchar',
            length: '150',
            isNullable: true,
          },
          {
            name: 'identity_card_customer',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'payment_location_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'payment_type_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'payment_type_state',
            type: this.paymentTypeStateEnumPath,
            default: `'GENERADO'`,
            isNullable: false,
          },
          {
            name: 'deposit_date',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'total',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys(`${this.schema}.vouchers`, [
      new TableForeignKey({
        columnNames: ['sale_id'],
        referencedSchema: this.schema,
        referencedTableName: 'sales',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
      new TableForeignKey({
        columnNames: ['payment_type_id'],
        referencedSchema: this.schema,
        referencedTableName: 'payment_types',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    ]);
  }

  private async createQrPaymentsTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(`${this.schema}.qr_payments_sales`)) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        schema: this.schema,
        name: 'qr_payments_sales',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'person_uuid',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'qr_id',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'qr_image',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'data_response',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'qr_status',
            type: 'enum',
            enumName: 'qr_status_enum',
            enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'EXPIRADO'],
            default: "'PENDIENTE'",
          },
          {
            name: 'expiration_date_qr',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_qr_payments_sales_person_uuid_expiration_date_qr"
       ON "${this.schema}"."qr_payments_sales" ("person_uuid", "expiration_date_qr")`,
    );
  }

  private async createSaleProductsTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (await queryRunner.hasTable(`${this.schema}.sale_products`)) {
      return;
    }

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
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
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

    for (const paymentType of PAYMENT_TYPES) {
      await queryRunner.query(
        `INSERT INTO "${this.schema}"."payment_types" (
          "id",
          "name",
          "description",
          "shortened"
        )
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("id")
         DO UPDATE SET
           "name" = EXCLUDED."name",
           "description" = EXCLUDED."description",
           "shortened" = EXCLUDED."shortened"`,
        [
          paymentType.id,
          paymentType.name,
          paymentType.description,
          paymentType.shortened,
        ],
      );
    }

    await queryRunner.query(
      `DELETE FROM "${this.schema}"."groups"
       WHERE "id" = ANY($1)`,
      [[3, 4, 5]],
    );

    await queryRunner.query(
      `INSERT INTO "${this.schema}"."parameters" ("id", "max_amount_product", "max_products", "currency_symbol", "is_active")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("id")
       DO UPDATE SET
         "max_amount_product" = EXCLUDED."max_amount_product",
         "max_products" = EXCLUDED."max_products",
         "currency_symbol" = EXCLUDED."currency_symbol",
         "is_active" = EXCLUDED."is_active"`,
      [
        PARAMETER.id,
        PARAMETER.maxAmountProduct,
        PARAMETER.maxProducts,
        PARAMETER.currencySymbol,
        PARAMETER.isActive,
      ],
    );

    await this.syncSequence(queryRunner, 'groups');
    await this.syncSequence(queryRunner, 'products');
    await this.syncSequence(queryRunner, 'parameters');
    await this.syncSequence(queryRunner, 'payment_types');
  }

  private async syncSequence(
    queryRunner: QueryRunner,
    tableName: string,
  ): Promise<void> {
    await queryRunner.query(
      `SELECT setval(
        pg_get_serial_sequence('"${this.schema}"."${tableName}"', 'id'),
        COALESCE((SELECT MAX("id") FROM "${this.schema}"."${tableName}"), 1),
        true
      )`,
    );
  }
}
