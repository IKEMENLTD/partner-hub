import { Reminder } from '../../reminder/entities/reminder.entity';
import { Task } from '../../task/entities/task.entity';

export interface ReminderEmailData {
  reminder: Reminder;
  task?: Task;
  recipientName: string;
}

export function generateReminderEmailHtml(data: ReminderEmailData): string {
  const { reminder, task, recipientName } = data;

  const taskSection = task
    ? `
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #495057;">Task Details</h3>
        <p style="margin: 5px 0;"><strong>Title:</strong> ${task.title}</p>
        ${task.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${task.description}</p>` : ''}
        ${task.dueDate ? `<p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString('ja-JP')}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Status:</strong> ${task.status}</p>
        <p style="margin: 5px 0;"><strong>Priority:</strong> ${task.priority}</p>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reminder.title}</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Reminder Notification</h1>
  </div>

  <div style="background-color: white; padding: 30px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Dear ${recipientName},</p>

    <h2 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
      ${reminder.title}
    </h2>

    <p style="font-size: 15px; color: #555;">
      ${reminder.message || 'You have a new reminder.'}
    </p>

    ${taskSection}

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
      <p style="color: #6c757d; font-size: 14px; margin: 0;">
        Scheduled at: ${new Date(reminder.scheduledAt).toLocaleString('ja-JP')}
      </p>
    </div>

    <div style="margin-top: 30px; text-align: center;">
      <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        View Details
      </a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
    <p>This is an automated notification from Partner Collaboration Platform.</p>
    <p>Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();
}

export function generateReminderEmailText(data: ReminderEmailData): string {
  const { reminder, task, recipientName } = data;

  let text = `
Dear ${recipientName},

=== REMINDER NOTIFICATION ===

${reminder.title}

${reminder.message || 'You have a new reminder.'}
`;

  if (task) {
    text += `

--- Task Details ---
Title: ${task.title}
${task.description ? `Description: ${task.description}` : ''}
${task.dueDate ? `Due Date: ${new Date(task.dueDate).toLocaleDateString('ja-JP')}` : ''}
Status: ${task.status}
Priority: ${task.priority}
`;
  }

  text += `

Scheduled at: ${new Date(reminder.scheduledAt).toLocaleString('ja-JP')}

---
This is an automated notification from Partner Collaboration Platform.
Please do not reply to this email.
`;

  return text.trim();
}
