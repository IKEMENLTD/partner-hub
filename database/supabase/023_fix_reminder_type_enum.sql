-- リマインダータイプenumにアプリケーションで使用する値を追加
ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'task_due';
ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'task_overdue';
ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'project_deadline';
ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'project_overdue';
ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'project_stagnant';
ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'status_update_request';
ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'partner_activity';
