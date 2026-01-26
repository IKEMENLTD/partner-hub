import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCustomFieldTemplates1706400000000 implements MigrationInterface {
  name = 'CreateCustomFieldTemplates1706400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'custom_field_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'fields',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'usage_count',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'custom_field_templates',
      new TableIndex({
        name: 'idx_custom_field_templates_name',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createIndex(
      'custom_field_templates',
      new TableIndex({
        name: 'idx_custom_field_templates_is_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'custom_field_templates',
      new TableIndex({
        name: 'idx_custom_field_templates_usage_count',
        columnNames: ['usage_count'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('custom_field_templates', 'idx_custom_field_templates_usage_count');
    await queryRunner.dropIndex('custom_field_templates', 'idx_custom_field_templates_is_active');
    await queryRunner.dropIndex('custom_field_templates', 'idx_custom_field_templates_name');
    await queryRunner.dropTable('custom_field_templates');
  }
}
