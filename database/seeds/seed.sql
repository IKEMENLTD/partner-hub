-- =============================================================================
-- Seed Data: Partner Collaboration Platform
-- Description: Test data for development and testing
-- Created: 2026-01-19
-- =============================================================================

BEGIN;

-- =============================================================================
-- Users (自社ユーザー)
-- =============================================================================

INSERT INTO users (id, email, password_hash, first_name, last_name, display_name, department, position, phone, is_active) VALUES
-- 管理者
('11111111-1111-1111-1111-111111111111', 'admin@example.com', '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '太郎', '山田', '山田 太郎', '経営管理部', '部長', '03-1234-5678', true),
-- プロジェクトマネージャー
('22222222-2222-2222-2222-222222222222', 'pm1@example.com', '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '花子', '佐藤', '佐藤 花子', 'プロジェクト管理部', 'プロジェクトマネージャー', '03-1234-5679', true),
('33333333-3333-3333-3333-333333333333', 'pm2@example.com', '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '一郎', '鈴木', '鈴木 一郎', 'プロジェクト管理部', 'シニアPM', '03-1234-5680', true),
-- メンバー
('44444444-4444-4444-4444-444444444444', 'member1@example.com', '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '次郎', '田中', '田中 次郎', '開発部', 'エンジニア', '03-1234-5681', true),
('55555555-5555-5555-5555-555555555555', 'member2@example.com', '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '美咲', '高橋', '高橋 美咲', '営業部', '営業担当', '03-1234-5682', true);

-- =============================================================================
-- Organizations (パートナー企業)
-- =============================================================================

INSERT INTO organizations (id, name, name_kana, short_name, organization_type, corporate_number, postal_code, address, phone, website_url, industry, employee_count, annual_revenue, is_active) VALUES
-- Tier1 パートナー
('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '株式会社テックパートナーズ', 'カブシキガイシャテックパートナーズ', 'テックP', 'corporation', '1234567890123', '100-0001', '東京都千代田区丸の内1-1-1', '03-1111-1111', 'https://techpartners.example.com', 'IT・ソフトウェア', 500, 5000000000, true),
('aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '株式会社クラウドソリューションズ', 'カブシキガイシャクラウドソリューションズ', 'クラウドS', 'corporation', '2345678901234', '150-0001', '東京都渋谷区渋谷2-2-2', '03-2222-2222', 'https://cloudsolutions.example.com', 'クラウドサービス', 300, 3000000000, true),
('aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '合同会社デザインワークス', 'ゴウドウガイシャデザインワークス', 'デザインW', 'corporation', '3456789012345', '106-0001', '東京都港区六本木3-3-3', '03-3333-3333', 'https://designworks.example.com', 'デザイン', 50, 500000000, true),
-- Tier2 パートナー
('aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '株式会社データアナリティクス', 'カブシキガイシャデータアナリティクス', 'データA', 'corporation', '4567890123456', '141-0001', '東京都品川区品川4-4-4', '03-4444-4444', 'https://dataanalytics.example.com', 'データ分析', 100, 1000000000, true),
('aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '株式会社セキュリティガード', 'カブシキガイシャセキュリティガード', 'セキュG', 'corporation', '5678901234567', '160-0001', '東京都新宿区新宿5-5-5', '03-5555-5555', 'https://securityguard.example.com', 'セキュリティ', 80, 800000000, true);

-- =============================================================================
-- Persons (パートナー担当者)
-- =============================================================================

INSERT INTO persons (id, organization_id, email, first_name, last_name, first_name_kana, last_name_kana, display_name, department, position, phone, mobile_phone, is_active) VALUES
-- テックパートナーズの担当者
('bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'yamamoto@techpartners.example.com', '健太', '山本', 'ケンタ', 'ヤマモト', '山本 健太', '事業開発部', '部長', '03-1111-1112', '090-1111-1111', true),
('bbbb1112-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'watanabe@techpartners.example.com', '由美', '渡辺', 'ユミ', 'ワタナベ', '渡辺 由美', '事業開発部', '主任', '03-1111-1113', '090-1111-1112', true),
-- クラウドソリューションズの担当者
('bbbb2221-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ito@cloudsolutions.example.com', '大輔', '伊藤', 'ダイスケ', 'イトウ', '伊藤 大輔', 'パートナー営業部', '課長', '03-2222-2223', '090-2222-2221', true),
-- デザインワークスの担当者
('bbbb3331-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'kobayashi@designworks.example.com', '愛', '小林', 'アイ', 'コバヤシ', '小林 愛', 'デザイン部', 'ディレクター', '03-3333-3334', '090-3333-3331', true),
-- データアナリティクスの担当者
('bbbb4441-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'kato@dataanalytics.example.com', '翔', '加藤', 'ショウ', 'カトウ', '加藤 翔', 'データサイエンス部', 'リーダー', '03-4444-4445', '090-4444-4441', true),
-- セキュリティガードの担当者
('bbbb5551-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'yoshida@securityguard.example.com', '隆', '吉田', 'タカシ', 'ヨシダ', '吉田 隆', 'セキュリティ診断部', 'マネージャー', '03-5555-5556', '090-5555-5551', true);

-- =============================================================================
-- Templates (テンプレート)
-- =============================================================================

INSERT INTO templates (id, name, description, project_type, is_default, is_active, version, created_by) VALUES
('cccc1111-cccc-cccc-cccc-cccccccccccc', '共同開発プロジェクト標準テンプレート', '共同開発案件の標準的なフェーズとタスクを定義したテンプレート', 'joint_development', true, true, 1, '11111111-1111-1111-1111-111111111111'),
('cccc2222-cccc-cccc-cccc-cccccccccccc', '販売提携テンプレート', '販売パートナーとの提携案件用テンプレート', 'sales_partnership', true, true, 1, '11111111-1111-1111-1111-111111111111'),
('cccc3333-cccc-cccc-cccc-cccccccccccc', '技術ライセンス契約テンプレート', '技術ライセンス契約に必要なフェーズとタスク', 'technology_license', true, true, 1, '11111111-1111-1111-1111-111111111111');

-- =============================================================================
-- Template Phases (テンプレートフェーズ)
-- =============================================================================

-- 共同開発テンプレートのフェーズ
INSERT INTO template_phases (id, template_id, name, description, sort_order, default_duration_days) VALUES
('dddd1111-dddd-dddd-dddd-dddddddddddd', 'cccc1111-cccc-cccc-cccc-cccccccccccc', '企画・要件定義', 'プロジェクトの企画と要件を定義するフェーズ', 1, 30),
('dddd1112-dddd-dddd-dddd-dddddddddddd', 'cccc1111-cccc-cccc-cccc-cccccccccccc', '設計', 'システム設計を行うフェーズ', 2, 45),
('dddd1113-dddd-dddd-dddd-dddddddddddd', 'cccc1111-cccc-cccc-cccc-cccccccccccc', '開発', '実装を行うフェーズ', 3, 90),
('dddd1114-dddd-dddd-dddd-dddddddddddd', 'cccc1111-cccc-cccc-cccc-cccccccccccc', 'テスト', '各種テストを実施するフェーズ', 4, 30),
('dddd1115-dddd-dddd-dddd-dddddddddddd', 'cccc1111-cccc-cccc-cccc-cccccccccccc', 'リリース・運用', 'リリースと運用移行のフェーズ', 5, 14);

-- 販売提携テンプレートのフェーズ
INSERT INTO template_phases (id, template_id, name, description, sort_order, default_duration_days) VALUES
('dddd2221-dddd-dddd-dddd-dddddddddddd', 'cccc2222-cccc-cccc-cccc-cccccccccccc', '提携検討', '提携の可能性を検討するフェーズ', 1, 14),
('dddd2222-dddd-dddd-dddd-dddddddddddd', 'cccc2222-cccc-cccc-cccc-cccccccccccc', '契約交渉', '契約条件の交渉フェーズ', 2, 30),
('dddd2223-dddd-dddd-dddd-dddddddddddd', 'cccc2222-cccc-cccc-cccc-cccccccccccc', '販売準備', '販売開始に向けた準備フェーズ', 3, 21),
('dddd2224-dddd-dddd-dddd-dddddddddddd', 'cccc2222-cccc-cccc-cccc-cccccccccccc', '販売開始・フォロー', '販売開始後のフォローフェーズ', 4, 90);

-- =============================================================================
-- Template Tasks (テンプレートタスク)
-- =============================================================================

-- 企画・要件定義フェーズのタスク
INSERT INTO template_tasks (id, template_phase_id, name, description, sort_order, default_duration_days, is_milestone, reminder_config) VALUES
('eeee1111-eeee-eeee-eeee-eeeeeeeeeeee', 'dddd1111-dddd-dddd-dddd-dddddddddddd', 'キックオフミーティング', '関係者全員でのキックオフ会議', 1, 1, true, '{"days_before": [3, 1]}'),
('eeee1112-eeee-eeee-eeee-eeeeeeeeeeee', 'dddd1111-dddd-dddd-dddd-dddddddddddd', '要件ヒアリング', '関係者から要件をヒアリング', 2, 7, false, '{"days_before": [3]}'),
('eeee1113-eeee-eeee-eeee-eeeeeeeeeeee', 'dddd1111-dddd-dddd-dddd-dddddddddddd', '要件定義書作成', '要件定義書の作成', 3, 14, false, '{"days_before": [5, 3]}'),
('eeee1114-eeee-eeee-eeee-eeeeeeeeeeee', 'dddd1111-dddd-dddd-dddd-dddddddddddd', '要件定義レビュー', '要件定義書のレビュー会議', 4, 3, true, '{"days_before": [3, 1]}');

-- 設計フェーズのタスク
INSERT INTO template_tasks (id, template_phase_id, name, description, sort_order, default_duration_days, is_milestone, reminder_config) VALUES
('eeee1121-eeee-eeee-eeee-eeeeeeeeeeee', 'dddd1112-dddd-dddd-dddd-dddddddddddd', '基本設計', 'システム基本設計の作成', 1, 21, false, '{"days_before": [7, 3]}'),
('eeee1122-eeee-eeee-eeee-eeeeeeeeeeee', 'dddd1112-dddd-dddd-dddd-dddddddddddd', '詳細設計', 'システム詳細設計の作成', 2, 21, false, '{"days_before": [7, 3]}'),
('eeee1123-eeee-eeee-eeee-eeeeeeeeeeee', 'dddd1112-dddd-dddd-dddd-dddddddddddd', '設計レビュー', '設計書のレビュー会議', 3, 3, true, '{"days_before": [3, 1]}');

-- =============================================================================
-- Projects (案件)
-- =============================================================================

INSERT INTO projects (id, name, code, description, project_type, company_role, status, health_score, start_date, end_date, budget, template_id, owner_user_id, custom_fields, tags) VALUES
-- 進行中の案件
('ffff1111-ffff-ffff-ffff-ffffffffffff', '次世代ECプラットフォーム共同開発', 'PRJ-2026-001', 'テックパートナーズ社との次世代ECプラットフォーム共同開発プロジェクト', 'joint_development', 'prime', 'in_progress', 85, '2026-01-15', '2026-09-30', 50000000, 'cccc1111-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '{"contract_type": "準委任", "billing_cycle": "monthly"}', ARRAY['EC', '共同開発', '重要案件']),
('ffff2222-ffff-ffff-ffff-ffffffffffff', 'クラウドセキュリティソリューション販売提携', 'PRJ-2026-002', 'セキュリティガード社製品の販売代理店契約', 'sales_partnership', 'partner', 'planning', 70, '2026-02-01', '2027-01-31', 10000000, 'cccc2222-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', '{"territory": "日本国内", "exclusive": true}', ARRAY['セキュリティ', '販売提携']),
-- 計画中の案件
('ffff3333-ffff-ffff-ffff-ffffffffffff', 'AIデータ分析基盤構築', 'PRJ-2026-003', 'データアナリティクス社との共同でAIデータ分析基盤を構築', 'joint_development', 'subcontractor', 'draft', NULL, '2026-03-01', '2026-12-31', 30000000, 'cccc1111-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '{}', ARRAY['AI', 'データ分析']);

-- =============================================================================
-- Project Phases (案件フェーズ)
-- =============================================================================

-- 次世代ECプラットフォームのフェーズ
INSERT INTO project_phases (id, project_id, template_phase_id, name, description, sort_order, planned_start_date, planned_end_date, actual_start_date, status) VALUES
('gggg1111-gggg-gggg-gggg-gggggggggggg', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'dddd1111-dddd-dddd-dddd-dddddddddddd', '企画・要件定義', 'プロジェクトの企画と要件を定義', 1, '2026-01-15', '2026-02-14', '2026-01-15', 'completed'),
('gggg1112-gggg-gggg-gggg-gggggggggggg', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'dddd1112-dddd-dddd-dddd-dddddddddddd', '設計', 'システム設計', 2, '2026-02-15', '2026-03-31', '2026-02-15', 'in_progress'),
('gggg1113-gggg-gggg-gggg-gggggggggggg', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'dddd1113-dddd-dddd-dddd-dddddddddddd', '開発', '実装', 3, '2026-04-01', '2026-06-30', NULL, 'draft'),
('gggg1114-gggg-gggg-gggg-gggggggggggg', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'dddd1114-dddd-dddd-dddd-dddddddddddd', 'テスト', '各種テスト', 4, '2026-07-01', '2026-08-31', NULL, 'draft'),
('gggg1115-gggg-gggg-gggg-gggggggggggg', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'dddd1115-dddd-dddd-dddd-dddddddddddd', 'リリース・運用', 'リリースと運用移行', 5, '2026-09-01', '2026-09-30', NULL, 'draft');

-- =============================================================================
-- Project Stakeholders (案件関係者)
-- =============================================================================

-- 次世代ECプラットフォームの関係者
INSERT INTO project_stakeholders (id, project_id, organization_id, tier, parent_stakeholder_id, role_description, contract_amount, is_primary) VALUES
-- Tier1: 直接取引先
('hhhh1111-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tier1', NULL, 'メイン開発パートナー', 35000000, true),
('hhhh1112-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tier1', NULL, 'UI/UXデザイン担当', 5000000, false),
-- Tier2: テックパートナーズの下請け
('hhhh1113-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tier2', 'hhhh1111-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'データ分析モジュール開発', 8000000, false),
('hhhh1114-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tier2', 'hhhh1111-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'セキュリティ監査', 2000000, false);

-- クラウドセキュリティソリューションの関係者
INSERT INTO project_stakeholders (id, project_id, organization_id, tier, parent_stakeholder_id, role_description, contract_amount, is_primary) VALUES
('hhhh2221-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'ffff2222-ffff-ffff-ffff-ffffffffffff', 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tier1', NULL, '製品提供元', 10000000, true);

-- =============================================================================
-- Stakeholder Contacts (関係者担当者)
-- =============================================================================

INSERT INTO stakeholder_contacts (id, project_stakeholder_id, person_id, is_primary, role) VALUES
-- テックパートナーズの担当者
('iiii1111-iiii-iiii-iiii-iiiiiiiiiiii', 'hhhh1111-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, 'プロジェクト責任者'),
('iiii1112-iiii-iiii-iiii-iiiiiiiiiiii', 'hhhh1111-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'bbbb1112-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false, '技術担当'),
-- デザインワークスの担当者
('iiii1121-iiii-iiii-iiii-iiiiiiiiiiii', 'hhhh1112-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'bbbb3331-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, 'デザインディレクター'),
-- データアナリティクスの担当者
('iiii1131-iiii-iiii-iiii-iiiiiiiiiiii', 'hhhh1113-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'bbbb4441-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, 'データ分析リーダー'),
-- セキュリティガードの担当者（EC案件）
('iiii1141-iiii-iiii-iiii-iiiiiiiiiiii', 'hhhh1114-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'bbbb5551-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, 'セキュリティコンサルタント'),
-- セキュリティガードの担当者（販売提携案件）
('iiii2211-iiii-iiii-iiii-iiiiiiiiiiii', 'hhhh2221-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'bbbb5551-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, '営業窓口');

-- =============================================================================
-- Tasks (タスク)
-- =============================================================================

-- 次世代ECプラットフォーム - 企画・要件定義フェーズのタスク
INSERT INTO tasks (id, project_id, project_phase_id, name, description, status, priority, assignee_id, due_date, planned_start_date, planned_end_date, actual_start_date, actual_end_date, is_milestone, sort_order, reminder_config) VALUES
('jjjj1111-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'gggg1111-gggg-gggg-gggg-gggggggggggg', 'キックオフミーティング', '関係者全員でのキックオフ会議を実施', 'completed', 1, '22222222-2222-2222-2222-222222222222', '2026-01-15', '2026-01-15', '2026-01-15', '2026-01-15', '2026-01-15', true, 1, '{"days_before": [3, 1]}'),
('jjjj1112-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'gggg1111-gggg-gggg-gggg-gggggggggggg', '要件ヒアリング（テックパートナーズ）', 'テックパートナーズ社から技術要件をヒアリング', 'completed', 2, '44444444-4444-4444-4444-444444444444', '2026-01-22', '2026-01-16', '2026-01-22', '2026-01-16', '2026-01-21', false, 2, NULL),
('jjjj1113-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'gggg1111-gggg-gggg-gggg-gggggggggggg', '要件定義書作成', '収集した要件をもとに要件定義書を作成', 'completed', 2, '22222222-2222-2222-2222-222222222222', '2026-02-07', '2026-01-23', '2026-02-07', '2026-01-23', '2026-02-05', false, 3, '{"days_before": [5, 3]}'),
('jjjj1114-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'gggg1111-gggg-gggg-gggg-gggggggggggg', '要件定義レビュー会議', '要件定義書のレビューと承認', 'completed', 1, '22222222-2222-2222-2222-222222222222', '2026-02-14', '2026-02-10', '2026-02-14', '2026-02-10', '2026-02-14', true, 4, '{"days_before": [3, 1]}');

-- 次世代ECプラットフォーム - 設計フェーズのタスク
INSERT INTO tasks (id, project_id, project_phase_id, name, description, status, priority, assignee_id, assignee_stakeholder_id, due_date, planned_start_date, planned_end_date, is_milestone, sort_order, reminder_config) VALUES
('jjjj1121-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'gggg1112-gggg-gggg-gggg-gggggggggggg', '基本設計書作成', 'システム全体の基本設計書を作成', 'in_progress', 2, '44444444-4444-4444-4444-444444444444', NULL, '2026-03-07', '2026-02-15', '2026-03-07', false, 1, '{"days_before": [7, 3]}'),
('jjjj1122-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'gggg1112-gggg-gggg-gggg-gggggggggggg', 'UI/UXデザイン作成', 'ユーザーインターフェースのデザイン', 'in_progress', 2, NULL, 'hhhh1112-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '2026-03-14', '2026-02-15', '2026-03-14', false, 2, '{"days_before": [7, 3]}'),
('jjjj1123-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'gggg1112-gggg-gggg-gggg-gggggggggggg', 'データベース設計', 'データベースのスキーマ設計', 'not_started', 2, '44444444-4444-4444-4444-444444444444', NULL, '2026-03-21', '2026-03-08', '2026-03-21', false, 3, '{"days_before": [5, 3]}'),
('jjjj1124-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'gggg1112-gggg-gggg-gggg-gggggggggggg', 'セキュリティ設計レビュー', 'セキュリティ観点での設計レビュー', 'not_started', 1, NULL, 'hhhh1114-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '2026-03-28', '2026-03-22', '2026-03-28', false, 4, '{"days_before": [5, 3]}'),
('jjjj1125-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'gggg1112-gggg-gggg-gggg-gggggggggggg', '設計完了レビュー', '設計フェーズの完了確認会議', 'not_started', 1, '22222222-2222-2222-2222-222222222222', NULL, '2026-03-31', '2026-03-29', '2026-03-31', true, 5, '{"days_before": [3, 1]}');

-- =============================================================================
-- Reminder Configs (リマインド設定)
-- =============================================================================

INSERT INTO reminder_configs (id, name, description, trigger_type, trigger_value, channels, message_template, is_active, created_by) VALUES
('kkkk1111-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '期限3日前リマインド', 'タスク期限の3日前に通知', 'before_due', 3, ARRAY['email', 'in_app']::notification_channel[], 'タスク「{{task_name}}」の期限が3日後（{{due_date}}）に迫っています。', true, '11111111-1111-1111-1111-111111111111'),
('kkkk2222-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '期限1日前リマインド', 'タスク期限の前日に通知', 'before_due', 1, ARRAY['email', 'slack', 'in_app']::notification_channel[], '【緊急】タスク「{{task_name}}」の期限が明日（{{due_date}}）です！', true, '11111111-1111-1111-1111-111111111111'),
('kkkk3333-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '期限超過リマインド', 'タスク期限超過後に毎日通知', 'after_due', 1, ARRAY['email', 'slack']::notification_channel[], '【期限超過】タスク「{{task_name}}」が期限（{{due_date}}）を過ぎています。対応をお願いします。', true, '11111111-1111-1111-1111-111111111111'),
('kkkk4444-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'マイルストーン1週間前リマインド', 'マイルストーンの1週間前に通知', 'before_due', 7, ARRAY['email', 'teams']::notification_channel[], 'マイルストーン「{{task_name}}」まで1週間（{{due_date}}）です。進捗を確認してください。', true, '11111111-1111-1111-1111-111111111111');

-- =============================================================================
-- Task Reminders (タスクリマインド設定)
-- =============================================================================

INSERT INTO task_reminders (id, task_id, reminder_config_id, is_enabled, next_trigger_at) VALUES
-- 設計フェーズタスクへのリマインド設定
('llll1111-llll-llll-llll-llllllllllll', 'jjjj1121-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'kkkk1111-kkkk-kkkk-kkkk-kkkkkkkkkkkk', true, '2026-03-04 09:00:00+09'),
('llll1112-llll-llll-llll-llllllllllll', 'jjjj1121-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'kkkk2222-kkkk-kkkk-kkkk-kkkkkkkkkkkk', true, '2026-03-06 09:00:00+09'),
('llll1121-llll-llll-llll-llllllllllll', 'jjjj1125-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'kkkk4444-kkkk-kkkk-kkkk-kkkkkkkkkkkk', true, '2026-03-24 09:00:00+09');

-- =============================================================================
-- Notification Logs (通知ログ)
-- =============================================================================

INSERT INTO notification_logs (id, task_id, project_id, reminder_config_id, recipient_user_id, recipient_email, channel, status, subject, message, sent_at, delivered_at) VALUES
-- 過去の通知履歴
('mmmm1111-mmmm-mmmm-mmmm-mmmmmmmmmmmm', 'jjjj1114-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'kkkk1111-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '22222222-2222-2222-2222-222222222222', 'pm1@example.com', 'email', 'delivered', 'タスク期限のお知らせ', 'タスク「要件定義レビュー会議」の期限が3日後（2026-02-14）に迫っています。', '2026-02-11 09:00:00+09', '2026-02-11 09:00:05+09'),
('mmmm1112-mmmm-mmmm-mmmm-mmmmmmmmmmmm', 'jjjj1114-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'ffff1111-ffff-ffff-ffff-ffffffffffff', 'kkkk2222-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '22222222-2222-2222-2222-222222222222', 'pm1@example.com', 'email', 'delivered', '【緊急】タスク期限のお知らせ', '【緊急】タスク「要件定義レビュー会議」の期限が明日（2026-02-14）です！', '2026-02-13 09:00:00+09', '2026-02-13 09:00:03+09');

-- =============================================================================
-- Task Comments (タスクコメント)
-- =============================================================================

INSERT INTO task_comments (id, task_id, user_id, content, is_internal) VALUES
('nnnn1111-nnnn-nnnn-nnnn-nnnnnnnnnnnn', 'jjjj1111-jjjj-jjjj-jjjj-nnnnnnnnnnnn', '22222222-2222-2222-2222-222222222222', 'キックオフミーティングを無事完了しました。議事録を添付します。', false),
('nnnn1112-nnnn-nnnn-nnnn-nnnnnnnnnnnn', 'jjjj1121-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '44444444-4444-4444-4444-444444444444', '基本設計の初稿を作成中です。来週にはレビュー依頼できる見込みです。', false),
('nnnn1113-nnnn-nnnn-nnnn-nnnnnnnnnnnn', 'jjjj1121-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '22222222-2222-2222-2222-222222222222', '【社内メモ】予算の都合で一部機能の優先度を下げる必要があるかもしれません。', true);

-- =============================================================================
-- Migration version tracking (optional)
-- =============================================================================

-- Create a simple migration tracking table if needed
CREATE TABLE IF NOT EXISTS _migrations (
    version VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO _migrations (version, name) VALUES ('001', 'initial')
ON CONFLICT (version) DO NOTHING;

COMMIT;
