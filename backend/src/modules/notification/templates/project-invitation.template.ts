import { Project } from '../../project/entities/project.entity';
import { Partner } from '../../partner/entities/partner.entity';

export interface ProjectInvitationEmailData {
  project: Project;
  partner: Partner;
  invitedBy?: string;
  role?: string;
}

export function generateProjectInvitationEmailHtml(data: ProjectInvitationEmailData): string {
  const { project, partner, invitedBy, role } = data;
  const platformUrl = 'https://partner-hub-frontend.onrender.com';

  const startDateStr = project.startDate
    ? new Date(project.startDate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '未設定';

  const endDateStr = project.endDate
    ? new Date(project.endDate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '未設定';

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>プロジェクトに招待されました</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">プロジェクトに招待されました</h1>
  </div>

  <div style="background-color: white; padding: 30px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${partner.name} 様</p>

    <p style="font-size: 15px; color: #555;">
      新しいプロジェクトのパートナーとして招待されましたのでお知らせいたします。
    </p>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">${project.name}</h2>

      ${project.description ? `
      <p style="color: #555; margin: 0 0 15px 0;">${project.description}</p>
      ` : ''}

      <table style="width: 100%; border-collapse: collapse;">
        ${role ? `
        <tr>
          <td style="padding: 8px 0; color: #6c757d; width: 100px;">役割:</td>
          <td style="padding: 8px 0; font-weight: bold;">${role}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">開始日:</td>
          <td style="padding: 8px 0;">${startDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">終了予定:</td>
          <td style="padding: 8px 0;">${endDateStr}</td>
        </tr>
        ${invitedBy ? `
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">招待者:</td>
          <td style="padding: 8px 0;">${invitedBy}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p style="font-size: 15px; color: #555;">
      プロジェクトの詳細を確認し、タスクの進捗管理にご協力ください。
    </p>

    <div style="margin-top: 30px; text-align: center;">
      <a href="${platformUrl}/projects/${project.id}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        プロジェクトを確認する
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

export function generateProjectInvitationEmailText(data: ProjectInvitationEmailData): string {
  const { project, partner, invitedBy, role } = data;
  const platformUrl = 'https://partner-hub-frontend.onrender.com';

  const startDateStr = project.startDate
    ? new Date(project.startDate).toLocaleDateString('ja-JP')
    : '未設定';

  const endDateStr = project.endDate
    ? new Date(project.endDate).toLocaleDateString('ja-JP')
    : '未設定';

  return `
${partner.name} 様

プロジェクトに招待されました

=== プロジェクト情報 ===
プロジェクト名: ${project.name}
${project.description ? `説明: ${project.description}` : ''}
${role ? `役割: ${role}` : ''}
開始日: ${startDateStr}
終了予定: ${endDateStr}
${invitedBy ? `招待者: ${invitedBy}` : ''}

プロジェクトURL: ${platformUrl}/projects/${project.id}

プロジェクトの詳細を確認し、タスクの進捗管理にご協力ください。

ご不明な点がございましたら、お気軽にお問い合わせください。

---
このメールは Partner Collaboration Platform から自動送信されています。
  `.trim();
}
