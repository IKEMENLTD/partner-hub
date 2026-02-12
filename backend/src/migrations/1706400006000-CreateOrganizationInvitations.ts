import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateOrganizationInvitations1706400006000 implements MigrationInterface {
  name = 'CreateOrganizationInvitations1706400006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // organization_invitations テーブルの作成
    await queryRunner.createTable(
      new Table({
        name: 'organization_invitations',
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
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['admin', 'manager', 'member', 'partner'],
            default: "'member'",
          },
          {
            name: 'token',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'invited_by_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'accepted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'accepted', 'expired', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'message',
            type: 'text',
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

    // Foreign keys
    await queryRunner.createForeignKey(
      'organization_invitations',
      new TableForeignKey({
        name: 'fk_org_invitations_organization',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'organization_invitations',
      new TableForeignKey({
        name: 'fk_org_invitations_invited_by',
        columnNames: ['invited_by_id'],
        referencedTableName: 'profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Indexes
    await queryRunner.createIndex(
      'organization_invitations',
      new TableIndex({
        name: 'idx_org_invitations_token',
        columnNames: ['token'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'organization_invitations',
      new TableIndex({
        name: 'idx_org_invitations_email_org',
        columnNames: ['email', 'organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'organization_invitations',
      new TableIndex({
        name: 'idx_org_invitations_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'organization_invitations',
      new TableIndex({
        name: 'idx_org_invitations_org_id',
        columnNames: ['organization_id'],
      }),
    );

    // updated_at trigger
    await queryRunner.query(`
      CREATE TRIGGER update_organization_invitations_updated_at
        BEFORE UPDATE ON public.organization_invitations
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_organization_invitations_updated_at ON public.organization_invitations`,
    );
    await queryRunner.dropForeignKey('organization_invitations', 'fk_org_invitations_invited_by');
    await queryRunner.dropForeignKey('organization_invitations', 'fk_org_invitations_organization');
    await queryRunner.dropTable('organization_invitations');
  }
}
