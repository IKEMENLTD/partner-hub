import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskSubtasksAndComments1706400005000 implements MigrationInterface {
  name = 'CreateTaskSubtasksAndComments1706400005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // task_subtasks テーブル
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_subtasks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" VARCHAR(255) NOT NULL,
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_subtasks_task_id" ON "task_subtasks" ("task_id")
    `);

    // task_comments テーブル
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_comments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "content" TEXT NOT NULL,
        "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "author_id" UUID NOT NULL REFERENCES "profiles"("id"),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_comments_task_id" ON "task_comments" ("task_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_comments_author_id" ON "task_comments" ("author_id")
    `);

    // progress カラムを tasks テーブルに追加（存在しない場合）
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tasks' AND column_name = 'progress'
        ) THEN
          ALTER TABLE "tasks" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_comments_author_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_comments_task_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_comments"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_subtasks_task_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_subtasks"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "progress"`);
  }
}
