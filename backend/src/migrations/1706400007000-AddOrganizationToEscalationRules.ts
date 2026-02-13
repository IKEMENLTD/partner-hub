import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationToEscalationRules1706400007000 implements MigrationInterface {
  name = 'AddOrganizationToEscalationRules1706400007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add organization_id column to escalation_rules
    await queryRunner.query(`
      ALTER TABLE "escalation_rules"
      ADD COLUMN IF NOT EXISTS "organization_id" uuid
    `);

    // Populate organization_id from project relationship for existing rules
    await queryRunner.query(`
      UPDATE "escalation_rules" er
      SET "organization_id" = p."organization_id"
      FROM "projects" p
      WHERE er."project_id" = p."id"
        AND er."organization_id" IS NULL
    `);

    // For global rules (no project_id), set organization_id from the creator's profile
    await queryRunner.query(`
      UPDATE "escalation_rules" er
      SET "organization_id" = pr."organization_id"
      FROM "profiles" pr
      WHERE er."created_by" = pr."id"
        AND er."project_id" IS NULL
        AND er."organization_id" IS NULL
    `);

    // For orphaned rules (seed data: no project_id, no created_by),
    // duplicate them into each existing organization so they aren't lost
    await queryRunner.query(`
      INSERT INTO "escalation_rules" (
        "id", "name", "description", "trigger_type", "trigger_value",
        "action", "status", "priority", "organization_id", "created_at", "updated_at"
      )
      SELECT
        uuid_generate_v4(),
        er."name", er."description", er."trigger_type", er."trigger_value",
        er."action", er."status", er."priority", o."id", er."created_at", now()
      FROM "escalation_rules" er
      CROSS JOIN "organizations" o
      WHERE er."organization_id" IS NULL
        AND er."project_id" IS NULL
    `);

    // Remove the original orphaned rules (now duplicated into each org)
    await queryRunner.query(`
      DELETE FROM "escalation_rules"
      WHERE "organization_id" IS NULL
        AND "project_id" IS NULL
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "escalation_rules"
      ADD CONSTRAINT "FK_escalation_rules_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE CASCADE
    `);

    // Add index for organization filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_escalation_rules_organization_id"
      ON "escalation_rules" ("organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_escalation_rules_organization_id"`);
    await queryRunner.query(`ALTER TABLE "escalation_rules" DROP CONSTRAINT IF EXISTS "FK_escalation_rules_organization"`);
    await queryRunner.query(`ALTER TABLE "escalation_rules" DROP COLUMN IF EXISTS "organization_id"`);
  }
}
