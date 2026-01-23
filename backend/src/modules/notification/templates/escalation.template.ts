import { Project } from '../../project/entities/project.entity';

export interface EscalationEmailData {
  escalationReason: string;
  escalationLevel: string;
  project: Project;
  recipientName: string;
  additionalInfo?: string;
}

export function generateEscalationEmailHtml(data: EscalationEmailData): string {
  const { escalationReason, escalationLevel, project, recipientName, additionalInfo } = data;

  const levelColor =
    escalationLevel === 'critical' ? '#dc3545' : escalationLevel === 'high' ? '#fd7e14' : '#ffc107';

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escalation Notice - ${project.name}</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: ${levelColor}; padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">
      ESCALATION NOTICE
    </h1>
    <p style="color: white; margin: 10px 0 0 0; font-size: 14px; text-transform: uppercase;">
      Level: ${escalationLevel}
    </p>
  </div>

  <div style="background-color: white; padding: 30px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Dear ${recipientName},</p>

    <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: #856404;">
        This is an escalation notification requiring your immediate attention.
      </p>
    </div>

    <h2 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">
      Escalation Reason
    </h2>
    <p style="font-size: 15px; color: #555;">
      ${escalationReason}
    </p>

    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #495057;">Project Details</h3>
      <p style="margin: 5px 0;"><strong>Project Name:</strong> ${project.name}</p>
      ${project.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${project.description}</p>` : ''}
      <p style="margin: 5px 0;"><strong>Status:</strong> ${project.status}</p>
      <p style="margin: 5px 0;"><strong>Priority:</strong> ${project.priority}</p>
      ${project.endDate ? `<p style="margin: 5px 0;"><strong>Deadline:</strong> ${new Date(project.endDate).toLocaleDateString('ja-JP')}</p>` : ''}
      <p style="margin: 5px 0;"><strong>Progress:</strong> ${project.progress}%</p>
    </div>

    ${
      additionalInfo
        ? `
    <div style="margin: 20px 0;">
      <h3 style="color: #495057;">Additional Information</h3>
      <p style="font-size: 14px; color: #555;">${additionalInfo}</p>
    </div>
    `
        : ''
    }

    <div style="margin-top: 30px; text-align: center;">
      <a href="#" style="background-color: ${levelColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        View Project
      </a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
    <p style="margin: 5px 0;">This escalation was generated automatically by Partner Collaboration Platform.</p>
    <p style="margin: 5px 0;">Please take appropriate action as soon as possible.</p>
  </div>
</body>
</html>
  `.trim();
}

export function generateEscalationEmailText(data: EscalationEmailData): string {
  const { escalationReason, escalationLevel, project, recipientName, additionalInfo } = data;

  let text = `
Dear ${recipientName},

========================================
  ESCALATION NOTICE - Level: ${escalationLevel.toUpperCase()}
========================================

*** This is an escalation notification requiring your immediate attention. ***

ESCALATION REASON:
${escalationReason}

--- Project Details ---
Project Name: ${project.name}
${project.description ? `Description: ${project.description}` : ''}
Status: ${project.status}
Priority: ${project.priority}
${project.endDate ? `Deadline: ${new Date(project.endDate).toLocaleDateString('ja-JP')}` : ''}
Progress: ${project.progress}%
`;

  if (additionalInfo) {
    text += `

Additional Information:
${additionalInfo}
`;
  }

  text += `

---
This escalation was generated automatically by Partner Collaboration Platform.
Please take appropriate action as soon as possible.
`;

  return text.trim();
}
