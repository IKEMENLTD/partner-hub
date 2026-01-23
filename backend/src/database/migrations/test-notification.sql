-- テスト通知を作成するSQL
-- 使い方: 自分のuser_idを確認してから実行

-- 1. 自分のuser_idを確認
SELECT id, email FROM user_profiles;

-- 2. テスト通知を挿入（上で確認したidに置き換えて実行）
INSERT INTO in_app_notifications (user_id, type, title, message, is_read)
VALUES (
  'ここにuser_idを貼り付け',  -- 例: '12345678-1234-1234-1234-123456789012'
  'system',
  'テスト通知です',
  'アプリ内通知が正常に動作しています。ベルアイコンをクリックして確認してください。',
  false
);
