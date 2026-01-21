import { DataSource } from 'typeorm';

interface EscalationRuleData {
  name: string;
  description: string;
  triggerType: string;
  triggerValue: number;
  action: string;
  status: string;
  priority: number;
}

const defaultRules: EscalationRuleData[] = [
  {
    name: '1日超過 → タスク担当者通知',
    description: 'タスク期限を1日超過した場合、タスク担当者に通知',
    triggerType: 'DAYS_AFTER_DUE',
    triggerValue: 1,
    action: 'NOTIFY_OWNER',
    status: 'ACTIVE',
    priority: 1,
  },
  {
    name: '3日超過 → 担当者 + 上位パートナー通知',
    description: 'タスク期限を3日超過した場合、担当者と上位パートナーに通知',
    triggerType: 'DAYS_AFTER_DUE',
    triggerValue: 3,
    action: 'NOTIFY_STAKEHOLDERS',
    status: 'ACTIVE',
    priority: 2,
  },
  {
    name: '7日超過 → 全員 + 案件担当通知',
    description: 'タスク期限を7日超過した場合、全員と案件担当に通知',
    triggerType: 'DAYS_AFTER_DUE',
    triggerValue: 7,
    action: 'NOTIFY_STAKEHOLDERS',
    status: 'ACTIVE',
    priority: 3,
  },
  {
    name: '14日超過 → マネージャーエスカレーション',
    description: 'タスク期限を14日超過した場合、マネージャーにエスカレーション',
    triggerType: 'DAYS_AFTER_DUE',
    triggerValue: 14,
    action: 'ESCALATE_TO_MANAGER',
    status: 'ACTIVE',
    priority: 4,
  },
  {
    name: '期限3日前の事前通知',
    description: 'タスク期限の3日前に担当者に事前通知',
    triggerType: 'DAYS_BEFORE_DUE',
    triggerValue: 3,
    action: 'NOTIFY_OWNER',
    status: 'ACTIVE',
    priority: 0,
  },
  {
    name: '期限1日前のリマインド',
    description: 'タスク期限の前日に担当者にリマインド',
    triggerType: 'DAYS_BEFORE_DUE',
    triggerValue: 1,
    action: 'NOTIFY_OWNER',
    status: 'ACTIVE',
    priority: 0,
  },
  {
    name: '進捗50%未達アラート',
    description: 'プロジェクト期間半ばで進捗50%未満の場合にアラート',
    triggerType: 'PROGRESS_BELOW',
    triggerValue: 50,
    action: 'NOTIFY_STAKEHOLDERS',
    status: 'ACTIVE',
    priority: 5,
  },
];

export async function seedEscalationRules(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Check if rules already exist
    const existingCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM escalation_rules`
    );

    if (parseInt(existingCount[0].count, 10) > 0) {
      console.log('Escalation rules already exist, skipping seed...');
      return;
    }

    for (const rule of defaultRules) {
      const result = await queryRunner.query(
        `INSERT INTO escalation_rules (
          id, name, description, project_id, trigger_type, trigger_value,
          action, status, priority, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, NULL, $3, $4, $5, $6, $7, NOW(), NOW()
        )
        RETURNING id`,
        [
          rule.name,
          rule.description,
          rule.triggerType,
          rule.triggerValue,
          rule.action,
          rule.status,
          rule.priority,
        ]
      );

      console.log(`Created escalation rule: ${rule.name} (${result[0].id})`);
    }

    console.log('Escalation rules seeded successfully!');
  } catch (error) {
    console.error('Error seeding escalation rules:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}
