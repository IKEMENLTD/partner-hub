import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUrgentToTaskPriority1706006400000 implements MigrationInterface {
  name = 'AddUrgentToTaskPriority1706006400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'urgent' value to task_priority enum if it doesn't exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'urgent'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_priority')
        ) THEN
          ALTER TYPE task_priority ADD VALUE 'urgent';
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type and updating all references
    console.log('Removing enum values is not supported. Manual intervention required.');
  }
}
