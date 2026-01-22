-- エスカレーションルール（デフォルト5つ）を投入
-- 実行: Supabase SQL Editor

INSERT INTO escalation_rules (id, name, description, trigger_type, trigger_value, action, status, priority, created_at, updated_at)
VALUES
(uuid_generate_v4(), '期限3日前の事前通知', 'タスク期限の3日前に担当者に事前通知', 'days_before_due', 3, 'notify_owner', 'active', 0, now(), now()),
(uuid_generate_v4(), '1日超過 → タスク担当者通知', 'タスク期限を1日超過した場合、タスク担当者に通知', 'days_after_due', 1, 'notify_owner', 'active', 1, now(), now()),
(uuid_generate_v4(), '3日超過 → 上位パートナー通知', 'タスク期限を3日超過した場合、上位パートナーに通知', 'days_after_due', 3, 'notify_stakeholders', 'active', 2, now(), now()),
(uuid_generate_v4(), '7日超過 → 案件担当通知', 'タスク期限を7日超過した場合、案件担当に通知', 'days_after_due', 7, 'notify_stakeholders', 'active', 3, now(), now()),
(uuid_generate_v4(), '14日超過 → マネージャーエスカレーション', 'タスク期限を14日超過した場合、マネージャーにエスカレーション', 'days_after_due', 14, 'escalate_to_manager', 'active', 4, now(), now())
ON CONFLICT DO NOTHING;

-- 投入確認
SELECT name, trigger_type, trigger_value, action, status FROM escalation_rules ORDER BY priority;
