import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * 自動レポート生成機能用マイグレーション
 *
 * このマイグレーションは以下を行います：
 * 1. report_configs テーブルの作成（レポート設定）
 * 2. generated_reports テーブルの作成（生成されたレポート）
 * 3. 必要なインデックスと外部キー制約の追加
 */
export class CreateReportTables1706400003000 implements MigrationInterface {
  name = 'CreateReportTables1706400003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =============================================
    // 1. report_period enum 型の作成
    // =============================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE report_period AS ENUM ('weekly', 'monthly');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // =============================================
    // 2. report_status enum 型の作成
    // =============================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE report_status AS ENUM ('active', 'paused', 'deleted');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // =============================================
    // 3. generated_report_status enum 型の作成
    // =============================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE generated_report_status AS ENUM ('pending', 'generated', 'sent', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // =============================================
    // 4. report_configs テーブルの作成
    // =============================================
    await queryRunner.createTable(
      new Table({
        name: 'report_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'period',
            type: 'report_period',
            isNullable: false,
            default: "'weekly'",
          },
          {
            name: 'status',
            type: 'report_status',
            isNullable: false,
            default: "'active'",
          },
          {
            name: 'schedule_cron',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'day_of_week',
            type: 'integer',
            isNullable: false,
            default: 1,
          },
          {
            name: 'day_of_month',
            type: 'integer',
            isNullable: false,
            default: 1,
          },
          {
            name: 'send_time',
            type: 'varchar',
            length: '10',
            isNullable: false,
            default: "'09:00'",
          },
          {
            name: 'recipients',
            type: 'text[]',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'include_project_summary',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'include_task_summary',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'include_partner_performance',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'include_highlights',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'project_ids',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'partner_ids',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'last_generated_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'next_run_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // report_configs の外部キー制約
    await queryRunner.createForeignKey(
      'report_configs',
      new TableForeignKey({
        name: 'fk_report_configs_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'profiles',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // report_configs のインデックス
    await queryRunner.createIndex(
      'report_configs',
      new TableIndex({
        name: 'idx_report_configs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'report_configs',
      new TableIndex({
        name: 'idx_report_configs_period',
        columnNames: ['period'],
      }),
    );

    await queryRunner.createIndex(
      'report_configs',
      new TableIndex({
        name: 'idx_report_configs_next_run_at',
        columnNames: ['next_run_at'],
      }),
    );

    await queryRunner.createIndex(
      'report_configs',
      new TableIndex({
        name: 'idx_report_configs_created_by',
        columnNames: ['created_by'],
      }),
    );

    await queryRunner.createIndex(
      'report_configs',
      new TableIndex({
        name: 'idx_report_configs_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    // =============================================
    // 5. generated_reports テーブルの作成
    // =============================================
    await queryRunner.createTable(
      new Table({
        name: 'generated_reports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'report_config_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'period',
            type: 'report_period',
            isNullable: false,
          },
          {
            name: 'date_range_start',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'date_range_end',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'generated_report_status',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'report_data',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'sent_to',
            type: 'text[]',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'sent_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_manual',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'generated_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // generated_reports の外部キー制約
    await queryRunner.createForeignKey(
      'generated_reports',
      new TableForeignKey({
        name: 'fk_generated_reports_config',
        columnNames: ['report_config_id'],
        referencedTableName: 'report_configs',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'generated_reports',
      new TableForeignKey({
        name: 'fk_generated_reports_generated_by',
        columnNames: ['generated_by'],
        referencedTableName: 'profiles',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // generated_reports のインデックス
    await queryRunner.createIndex(
      'generated_reports',
      new TableIndex({
        name: 'idx_generated_reports_config_id',
        columnNames: ['report_config_id'],
      }),
    );

    await queryRunner.createIndex(
      'generated_reports',
      new TableIndex({
        name: 'idx_generated_reports_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'generated_reports',
      new TableIndex({
        name: 'idx_generated_reports_period',
        columnNames: ['period'],
      }),
    );

    await queryRunner.createIndex(
      'generated_reports',
      new TableIndex({
        name: 'idx_generated_reports_date_range',
        columnNames: ['date_range_start', 'date_range_end'],
      }),
    );

    await queryRunner.createIndex(
      'generated_reports',
      new TableIndex({
        name: 'idx_generated_reports_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'generated_reports',
      new TableIndex({
        name: 'idx_generated_reports_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    // =============================================
    // 6. updated_at トリガーの追加
    // =============================================
    await queryRunner.query(`
      CREATE TRIGGER update_report_configs_updated_at
        BEFORE UPDATE ON public.report_configs
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column()
    `);

    // =============================================
    // 7. RLSポリシーの追加
    // =============================================
    await queryRunner.query(`ALTER TABLE "report_configs" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "generated_reports" ENABLE ROW LEVEL SECURITY`);

    // report_configs: 自分が作成した設定、または同じ組織の設定を閲覧可能
    await queryRunner.query(`
      CREATE POLICY "report_configs_select"
        ON public.report_configs
        FOR SELECT
        USING (
          created_by = auth.uid()
          OR organization_id IN (SELECT public.get_user_organization_ids())
          OR organization_id IS NULL
          OR public.is_admin()
        )
    `);

    // report_configs: 作成は認証済みユーザー
    await queryRunner.query(`
      CREATE POLICY "report_configs_insert"
        ON public.report_configs
        FOR INSERT
        WITH CHECK (auth.role() = 'authenticated')
    `);

    // report_configs: 更新は作成者または組織管理者
    await queryRunner.query(`
      CREATE POLICY "report_configs_update"
        ON public.report_configs
        FOR UPDATE
        USING (
          created_by = auth.uid()
          OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
          OR public.is_admin()
        )
    `);

    // report_configs: 削除は作成者または組織管理者
    await queryRunner.query(`
      CREATE POLICY "report_configs_delete"
        ON public.report_configs
        FOR DELETE
        USING (
          created_by = auth.uid()
          OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
          OR public.is_admin()
        )
    `);

    // generated_reports: 同じ組織または自分が生成したレポートを閲覧可能
    await queryRunner.query(`
      CREATE POLICY "generated_reports_select"
        ON public.generated_reports
        FOR SELECT
        USING (
          generated_by = auth.uid()
          OR organization_id IN (SELECT public.get_user_organization_ids())
          OR organization_id IS NULL
          OR public.is_admin()
        )
    `);

    // generated_reports: 作成は認証済みユーザー
    await queryRunner.query(`
      CREATE POLICY "generated_reports_insert"
        ON public.generated_reports
        FOR INSERT
        WITH CHECK (auth.role() = 'authenticated')
    `);

    // =============================================
    // 8. テーブルコメント追加
    // =============================================
    await queryRunner.query(`
      COMMENT ON TABLE public.report_configs IS '自動レポート生成設定テーブル'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE public.generated_reports IS '生成されたレポートテーブル'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN public.report_configs.period IS 'レポート期間（weekly/monthly）'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN public.report_configs.schedule_cron IS 'スケジュール実行用のCron式'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN public.report_configs.recipients IS 'レポート送信先メールアドレス一覧'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN public.generated_reports.report_data IS 'レポートデータ（JSON形式）'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN public.generated_reports.is_manual IS '手動生成フラグ'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // RLSポリシーの削除
    await queryRunner.query(`DROP POLICY IF EXISTS "generated_reports_insert" ON public.generated_reports`);
    await queryRunner.query(`DROP POLICY IF EXISTS "generated_reports_select" ON public.generated_reports`);
    await queryRunner.query(`DROP POLICY IF EXISTS "report_configs_delete" ON public.report_configs`);
    await queryRunner.query(`DROP POLICY IF EXISTS "report_configs_update" ON public.report_configs`);
    await queryRunner.query(`DROP POLICY IF EXISTS "report_configs_insert" ON public.report_configs`);
    await queryRunner.query(`DROP POLICY IF EXISTS "report_configs_select" ON public.report_configs`);

    // トリガーの削除
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_report_configs_updated_at ON public.report_configs`);

    // generated_reports テーブルの削除
    await queryRunner.dropForeignKey('generated_reports', 'fk_generated_reports_generated_by');
    await queryRunner.dropForeignKey('generated_reports', 'fk_generated_reports_config');
    await queryRunner.dropTable('generated_reports');

    // report_configs テーブルの削除
    await queryRunner.dropForeignKey('report_configs', 'fk_report_configs_created_by');
    await queryRunner.dropTable('report_configs');

    // ENUM型の削除
    await queryRunner.query(`DROP TYPE IF EXISTS generated_report_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS report_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS report_period`);
  }
}
