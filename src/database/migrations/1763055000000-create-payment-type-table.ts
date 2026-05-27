import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';
import { dbEnvs } from 'src/config';

export class CreatePaymentTypeTable1763055000000 implements MigrationInterface {
  name = 'CreatePaymentTypeTable1763055000000';

  private readonly schema = dbEnvs.dbSchema;

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable(`${this.schema}.payment_type`))) {
      await queryRunner.createTable(
        new Table({
          schema: this.schema,
          name: 'payment_type',
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

    await queryRunner.query(
      `INSERT INTO "${this.schema}"."payment_type" (
        "id",
        "name",
        "description",
        "shortened"
      )
       VALUES
        (1, 'Efectivo', 'Pago personal', 'EF'),
        (2, 'Código QR', 'Código por QR', 'QR'),
        (3, 'Depósito', 'Depósito Bancario', 'DEP'),
        (4, 'Transferencia', 'Transferencia entre Bancos', 'TRANSF')
       ON CONFLICT ("id")
       DO UPDATE SET
         "name" = EXCLUDED."name",
         "description" = EXCLUDED."description",
         "shortened" = EXCLUDED."shortened"`,
    );

    await queryRunner.query(
      `SELECT setval(
        pg_get_serial_sequence('"${this.schema}"."payment_type"', 'id'),
        COALESCE((SELECT MAX("id") FROM "${this.schema}"."payment_type"), 1),
        true
      )`,
    );

    await queryRunner.createForeignKey(
      `${this.schema}.sales`,
      new TableForeignKey({
        columnNames: ['payment_type_id'],
        referencedSchema: this.schema,
        referencedTableName: 'payment_type',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(`${this.schema}.sales`)) {
      const table = await queryRunner.getTable(`${this.schema}.sales`);
      const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.includes('payment_type_id'));
      if (foreignKey) {
        await queryRunner.dropForeignKey(`${this.schema}.sales`, foreignKey);
      }
    }

    if (await queryRunner.hasTable(`${this.schema}.payment_type`)) {
      await queryRunner.dropTable(`${this.schema}.payment_type`, true, true, true);
    }
  }
}