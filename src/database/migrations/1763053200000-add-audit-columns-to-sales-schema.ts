import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAuditColumnsToSalesSchema1763053200000
  implements MigrationInterface
{
  name = 'AddAuditColumnsToSalesSchema1763053200000';

  private readonly schema = 'sales';
  private readonly tables = [
    'groups',
    'parameters',
    'products',
    'sales',
    'sale_products',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await this.addAuditColumns(queryRunner, `${this.schema}.${table}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...this.tables].reverse()) {
      await this.dropAuditColumns(queryRunner, `${this.schema}.${table}`);
    }
  }

  private async addAuditColumns(queryRunner: QueryRunner, table: string) {
    if (!(await queryRunner.hasColumn(table, 'created_at'))) {
      await queryRunner.addColumn(
        table,
        new TableColumn({
          name: 'created_at',
          type: 'timestamp',
          default: 'now()',
          isNullable: false,
        }),
      );
    }

    if (!(await queryRunner.hasColumn(table, 'updated_at'))) {
      await queryRunner.addColumn(
        table,
        new TableColumn({
          name: 'updated_at',
          type: 'timestamp',
          default: 'now()',
          isNullable: false,
        }),
      );
    }

    if (!(await queryRunner.hasColumn(table, 'deleted_at'))) {
      await queryRunner.addColumn(
        table,
        new TableColumn({
          name: 'deleted_at',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }
  }

  private async dropAuditColumns(queryRunner: QueryRunner, table: string) {
    if (await queryRunner.hasColumn(table, 'deleted_at')) {
      await queryRunner.dropColumn(table, 'deleted_at');
    }

    if (await queryRunner.hasColumn(table, 'updated_at')) {
      await queryRunner.dropColumn(table, 'updated_at');
    }

    if (await queryRunner.hasColumn(table, 'created_at')) {
      await queryRunner.dropColumn(table, 'created_at');
    }
  }
}
