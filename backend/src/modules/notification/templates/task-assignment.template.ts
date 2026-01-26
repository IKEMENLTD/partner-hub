import { Task } from '../../task/entities/task.entity';
import { Partner } from '../../partner/entities/partner.entity';

export interface TaskAssignmentEmailData {
  task: Task;
  partner: Partner;
  assignedBy?: string;
}

export function generateTaskAssignmentEmailHtml(data: TaskAssignmentEmailData): string {
  const { task, partner, assignedBy } = data;
  const platformUrl = 'https://partner-hub-frontend.onrender.com';
  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '未設定';

  const priorityLabel = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '緊急',
  }[task.priority] || task.priority;

  const priorityColor = {
    low: '#28a745',
    medium: '#ffc107',
    high: '#fd7e14',
    urgent: '#dc3545',
  }[task.priority] || '#6c757d';

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>新しいタスクが割り当てられました</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">新しいタスクが割り当てられました</h1>
  </div>

  <div style="background-color: white; padding: 30px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${partner.name} 様</p>

    <p style="font-size: 15px; color: #555;">
      新しいタスクが割り当てられましたのでお知らせいたします。
    </p>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">${task.title}</h2>

      ${task.description ? `
      <p style="color: #555; margin: 0 0 15px 0;">${task.description}</p>
      ` : ''}

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6c757d; width: 100px;">期限:</td>
          <td style="padding: 8px 0; font-weight: bold;">${dueDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">優先度:</td>
          <td style="padding: 8px 0;">
            <span style="background-color: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${priorityLabel}</span>
          </td>
        </tr>
        ${task.project ? `
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">案件:</td>
          <td style="padding: 8px 0;">${task.project.name}</td>
        </tr>
        ` : ''}
        ${assignedBy ? `
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">割当者:</td>
          <td style="padding: 8px 0;">${assignedBy}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="margin-top: 30px; text-align: center;">
      <a href="${platformUrl}/tasks/${task.id}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        タスクを確認する
      </a>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
      <p style="color: #6c757d; font-size: 14px; margin: 0;">
        ご不明な点がございましたら、お気軽にお問い合わせください。
      </p>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
    <p>このメールは Partner Collaboration Platform から自動送信されています。</p>
  </div>
</body>
</html>
  `.trim();
}

export function generateTaskAssignmentEmailText(data: TaskAssignmentEmailData): string {
  const { task, partner, assignedBy } = data;
  const platformUrl = 'https://partner-hub-frontend.onrender.com';
  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('ja-JP')
    : '未設定';

  const priorityLabel = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '緊急',
  }[task.priority] || task.priority;

  return `
${partner.name} 様

新しいタスクが割り当てられました

=== タスク情報 ===
タイトル: ${task.title}
${task.description ? `説明: ${task.description}` : ''}
期限: ${dueDateStr}
優先度: ${priorityLabel}
${task.project ? `案件: ${task.project.name}` : ''}
${assignedBy ? `割当者: ${assignedBy}` : ''}

タスクURL: ${platformUrl}/tasks/${task.id}

ご不明な点がございましたら、お気軽にお問い合わせください。

---
このメールは Partner Collaboration Platform から自動送信されています。
  `.trim();
}
