import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTables1705900000000 implements MigrationInterface {
  name = 'CreateNotificationTables1705900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_channel_type_enum" AS ENUM ('email', 'slack', 'in_app', 'webhook');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_status_enum" AS ENUM ('pending', 'sent', 'failed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_type_enum" AS ENUM ('reminder', 'escalation', 'task_update', 'project_update', 'system');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create notification_settings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "digest_enabled" boolean NOT NULL DEFAULT true,
        "digest_time" varchar(5) NOT NULL DEFAULT '07:00',
        "deadline_notification" boolean NOT NULL DEFAULT true,
        "assignee_change_notification" boolean NOT NULL DEFAULT true,
        "mention_notification" boolean NOT NULL DEFAULT true,
        "status_change_notification" boolean NOT NULL DEFAULT true,
        "reminder_max_count" integer NOT NULL DEFAULT 3,
        "email_notification" boolean NOT NULL DEFAULT true,
        "push_notification" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_settings_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_notification_settings_user" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE
      )
    `);

    // Create notification_channels table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_channels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "type" "notification_channel_type_enum" NOT NULL DEFAULT 'in_app',
        "is_active" boolean NOT NULL DEFAULT true,
        "channel_id" varchar,
        "project_id" uuid,
        "user_id" uuid,
        "config" jsonb,
        "created_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_channels" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_channels_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_channels_user" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notification_channels_created_by" FOREIGN KEY ("created_by") REFERENCES "user_profiles"("id") ON DELETE SET NULL
      )
    `);

    // Create notification_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "notification_type_enum" NOT NULL DEFAULT 'system',
        "channelType" "notification_channel_type_enum" NOT NULL,
        "status" "notification_status_enum" NOT NULL DEFAULT 'pending',
        "recipient_id" uuid,
        "channel_id" uuid,
        "subject" varchar NOT NULL,
        "message" text,
        "payload" jsonb,
        "external_id" varchar,
        "error_message" text,
        "retry_count" integer NOT NULL DEFAULT 0,
        "sent_at" TIMESTAMP,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_logs_recipient" FOREIGN KEY ("recipient_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notification_logs_channel" FOREIGN KEY ("channel_id") REFERENCES "notification_channels"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_settings_user_id" ON "notification_settings" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_channels_project_id" ON "notification_channels" ("project_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_channels_user_id" ON "notification_channels" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_logs_recipient_id" ON "notification_logs" ("recipient_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_logs_status" ON "notification_logs" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_logs_created_at" ON "notification_logs" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_channels"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_settings"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel_type_enum"`);
  }
}
