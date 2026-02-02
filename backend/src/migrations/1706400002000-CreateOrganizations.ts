import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * マルチテナント対応マイグレーション
 *
 * このマイグレーションは以下を行います：
 * 1. organizations テーブルの作成
 * 2. profiles テーブルに organization_id カラムを追加
 * 3. partners テーブルに organization_id カラムを追加
 * 4. 組織ベースのRLSポリシーを追加
 *
 * 既存データの移行方針：
 * - organization_id は nullable で追加（既存データ対応）
 * - 既存データは後続のデータマイグレーションでデフォルト組織に紐付け
 */
export class CreateOrganizations1706400002000 implements MigrationInterface {
  name = 'CreateOrganizations1706400002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =============================================
    // 1. organizations テーブルの作成
    // =============================================
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
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
            length: '500',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'logo_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'plan',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'free'",
          },
          {
            name: 'max_members',
            type: 'integer',
            isNullable: false,
            default: 5,
          },
          {
            name: 'max_partners',
            type: 'integer',
            isNullable: false,
            default: 50,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'owner_id',
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
        ],
      }),
      true,
    );

    // organizations テーブルのインデックス
    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'idx_organizations_slug',
        columnNames: ['slug'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'idx_organizations_is_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'idx_organizations_plan',
        columnNames: ['plan'],
      }),
    );

    // =============================================
    // 2. profiles テーブルに organization_id を追加
    // =============================================
    await queryRunner.query(`
      ALTER TABLE "profiles"
      ADD COLUMN "organization_id" UUID REFERENCES "organizations"("id") ON DELETE SET NULL
    `);

    await queryRunner.createIndex(
      'profiles',
      new TableIndex({
        name: 'idx_profiles_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    // =============================================
    // 3. partners テーブルに organization_id を追加
    // =============================================
    await queryRunner.query(`
      ALTER TABLE "partners"
      ADD COLUMN "organization_id" UUID REFERENCES "organizations"("id") ON DELETE SET NULL
    `);

    await queryRunner.createIndex(
      'partners',
      new TableIndex({
        name: 'idx_partners_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    // =============================================
    // 4. organization_members テーブルの作成（組織メンバーシップ）
    // =============================================
    await queryRunner.createTable(
      new Table({
        name: 'organization_members',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'member'",
          },
          {
            name: 'is_primary',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'invited_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'joined_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
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
        ],
      }),
      true,
    );

    // organization_members の外部キー制約
    await queryRunner.createForeignKey(
      'organization_members',
      new TableForeignKey({
        name: 'fk_organization_members_organization',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'organization_members',
      new TableForeignKey({
        name: 'fk_organization_members_user',
        columnNames: ['user_id'],
        referencedTableName: 'profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // organization_members のインデックス
    await queryRunner.createIndex(
      'organization_members',
      new TableIndex({
        name: 'idx_organization_members_org_user',
        columnNames: ['organization_id', 'user_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'organization_members',
      new TableIndex({
        name: 'idx_organization_members_user_id',
        columnNames: ['user_id'],
      }),
    );

    // =============================================
    // 5. RLS用ヘルパー関数の作成
    // =============================================

    // ユーザーが所属する組織IDを取得する関数
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
      RETURNS SETOF UUID
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $$
        SELECT organization_id
        FROM public.organization_members
        WHERE user_id = auth.uid()
      $$;
    `);

    // ユーザーのプライマリ組織IDを取得する関数
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.get_user_primary_organization_id()
      RETURNS UUID
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $$
        SELECT organization_id
        FROM public.organization_members
        WHERE user_id = auth.uid() AND is_primary = true
        LIMIT 1
      $$;
    `);

    // 同じ組織に所属しているかチェックする関数
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.is_same_organization(target_org_id UUID)
      RETURNS BOOLEAN
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE user_id = auth.uid()
          AND organization_id = target_org_id
        )
      $$;
    `);

    // 組織内でのロールをチェックする関数
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.get_org_role(target_org_id UUID)
      RETURNS VARCHAR
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $$
        SELECT role
        FROM public.organization_members
        WHERE user_id = auth.uid()
        AND organization_id = target_org_id
        LIMIT 1
      $$;
    `);

    // 組織の管理者かどうかをチェックする関数
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id UUID)
      RETURNS BOOLEAN
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE user_id = auth.uid()
          AND organization_id = target_org_id
          AND role IN ('owner', 'admin')
        )
      $$;
    `);

    // =============================================
    // 6. organizations テーブルのRLSポリシー
    // =============================================
    await queryRunner.query(`ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY`);

    // 所属組織の閲覧を許可
    await queryRunner.query(`
      CREATE POLICY "organizations_select_member"
        ON public.organizations
        FOR SELECT
        USING (
          id IN (SELECT public.get_user_organization_ids())
          OR public.is_admin()
        )
    `);

    // 組織の更新は組織管理者のみ
    await queryRunner.query(`
      CREATE POLICY "organizations_update_admin"
        ON public.organizations
        FOR UPDATE
        USING (
          public.is_org_admin(id)
          OR public.is_admin()
        )
    `);

    // 組織の作成は認証済みユーザー
    await queryRunner.query(`
      CREATE POLICY "organizations_insert_authenticated"
        ON public.organizations
        FOR INSERT
        WITH CHECK (auth.role() = 'authenticated')
    `);

    // =============================================
    // 7. organization_members テーブルのRLSポリシー
    // =============================================
    await queryRunner.query(`ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY`);

    // 同じ組織のメンバーを閲覧可能
    await queryRunner.query(`
      CREATE POLICY "organization_members_select"
        ON public.organization_members
        FOR SELECT
        USING (
          organization_id IN (SELECT public.get_user_organization_ids())
          OR public.is_admin()
        )
    `);

    // 組織管理者のみメンバーを追加可能
    await queryRunner.query(`
      CREATE POLICY "organization_members_insert"
        ON public.organization_members
        FOR INSERT
        WITH CHECK (
          public.is_org_admin(organization_id)
          OR public.is_admin()
        )
    `);

    // 組織管理者のみメンバーを更新可能
    await queryRunner.query(`
      CREATE POLICY "organization_members_update"
        ON public.organization_members
        FOR UPDATE
        USING (
          public.is_org_admin(organization_id)
          OR public.is_admin()
        )
    `);

    // 組織管理者のみメンバーを削除可能
    await queryRunner.query(`
      CREATE POLICY "organization_members_delete"
        ON public.organization_members
        FOR DELETE
        USING (
          public.is_org_admin(organization_id)
          OR public.is_admin()
          OR user_id = auth.uid()
        )
    `);

    // =============================================
    // 8. 組織ベースのRLSポリシーを追加（段階的更新用）
    // =============================================

    // profiles: 同じ組織のメンバーを閲覧可能にするポリシー追加
    await queryRunner.query(`
      CREATE POLICY "profiles_select_same_org"
        ON public.profiles
        FOR SELECT
        USING (
          organization_id IS NULL
          OR organization_id IN (SELECT public.get_user_organization_ids())
        )
    `);

    // partners: 同じ組織のパートナーのみ閲覧可能にするポリシー追加
    await queryRunner.query(`
      CREATE POLICY "partners_select_same_org"
        ON public.partners
        FOR SELECT
        USING (
          organization_id IS NULL
          OR organization_id IN (SELECT public.get_user_organization_ids())
        )
    `);

    // partners: 同じ組織のパートナーのみ更新可能にするポリシー追加
    await queryRunner.query(`
      CREATE POLICY "partners_update_same_org"
        ON public.partners
        FOR UPDATE
        USING (
          (organization_id IS NULL AND public.is_manager_or_above())
          OR (organization_id IN (SELECT public.get_user_organization_ids()) AND public.is_manager_or_above())
        )
    `);

    // =============================================
    // 9. updated_at トリガーの追加
    // =============================================
    await queryRunner.query(`
      CREATE TRIGGER update_organizations_updated_at
        BEFORE UPDATE ON public.organizations
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_organization_members_updated_at
        BEFORE UPDATE ON public.organization_members
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column()
    `);

    // =============================================
    // 10. テーブルコメント追加
    // =============================================
    await queryRunner.query(`
      COMMENT ON TABLE public.organizations IS 'マルチテナント対応のための組織テーブル'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE public.organization_members IS '組織とユーザーの関連テーブル'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN public.organizations.slug IS '組織の一意なスラッグ（URL用）'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN public.organizations.plan IS '契約プラン（free, pro, enterprise）'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN public.organization_members.is_primary IS 'ユーザーのプライマリ組織フラグ'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // RLSポリシーの削除（段階的更新用）
    await queryRunner.query(`DROP POLICY IF EXISTS "partners_update_same_org" ON public.partners`);
    await queryRunner.query(`DROP POLICY IF EXISTS "partners_select_same_org" ON public.partners`);
    await queryRunner.query(`DROP POLICY IF EXISTS "profiles_select_same_org" ON public.profiles`);

    // organization_members のRLSポリシー削除
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_members_delete" ON public.organization_members`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_members_update" ON public.organization_members`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_members_insert" ON public.organization_members`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_members_select" ON public.organization_members`,
    );

    // organizations のRLSポリシー削除
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organizations_insert_authenticated" ON public.organizations`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organizations_update_admin" ON public.organizations`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations`,
    );

    // トリガーの削除
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_organization_members_updated_at ON public.organization_members`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations`,
    );

    // ヘルパー関数の削除
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.is_org_admin(UUID)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.get_org_role(UUID)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.is_same_organization(UUID)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.get_user_primary_organization_id()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.get_user_organization_ids()`);

    // partners テーブルから organization_id を削除
    await queryRunner.dropIndex('partners', 'idx_partners_organization_id');
    await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "organization_id"`);

    // profiles テーブルから organization_id を削除
    await queryRunner.dropIndex('profiles', 'idx_profiles_organization_id');
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "organization_id"`);

    // organization_members テーブルの削除
    await queryRunner.dropForeignKey('organization_members', 'fk_organization_members_user');
    await queryRunner.dropForeignKey(
      'organization_members',
      'fk_organization_members_organization',
    );
    await queryRunner.dropTable('organization_members');

    // organizations テーブルの削除
    await queryRunner.dropTable('organizations');
  }
}
