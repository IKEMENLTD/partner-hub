import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddOrganizationToCustomFieldTemplates1706400001000 implements MigrationInterface {
  name = 'AddOrganizationToCustomFieldTemplates1706400001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add organization_id column
    await queryRunner.addColumn(
      'custom_field_templates',
      new TableColumn({
        name: 'organization_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Create index for organization_id
    await queryRunner.createIndex(
      'custom_field_templates',
      new TableIndex({
        name: 'idx_custom_field_templates_organization_id',
        columnNames: ['organization_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('custom_field_templates', 'idx_custom_field_templates_organization_id');
    await queryRunner.dropColumn('custom_field_templates', 'organization_id');
  }
}
