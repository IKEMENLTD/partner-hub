import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartnerInvitations1706400001000 implements MigrationInterface {
  name = 'CreatePartnerInvitations1706400001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "partner_invitations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "partner_id" UUID NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
        "token" VARCHAR(255) NOT NULL UNIQUE,
        "email" VARCHAR(255) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "used_at" TIMESTAMPTZ,
        "created_by" UUID REFERENCES "profiles"("id"),
        "created_at" TIMESTAMPTZ DEFAULT now(),
        "updated_at" TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Index for token lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_partner_invitations_token" ON "partner_invitations" ("token")
    `);

    // Index for partner lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_partner_invitations_partner_id" ON "partner_invitations" ("partner_id")
    `);

    // Index for email lookup (to check pending invitations on login)
    await queryRunner.query(`
      CREATE INDEX "IDX_partner_invitations_email" ON "partner_invitations" ("email")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_partner_invitations_email"`);
    await queryRunner.query(`DROP INDEX "IDX_partner_invitations_partner_id"`);
    await queryRunner.query(`DROP INDEX "IDX_partner_invitations_token"`);
    await queryRunner.query(`DROP TABLE "partner_invitations"`);
  }
}
