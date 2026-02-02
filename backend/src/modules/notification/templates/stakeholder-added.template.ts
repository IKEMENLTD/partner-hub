import { Project } from '../../project/entities/project.entity';
import { Partner } from '../../partner/entities/partner.entity';

export interface StakeholderAddedEmailData {
  project: Project;
  partner: Partner;
  stakeholderRole: string;
  addedBy?: string;
}

export function generateStakeholderAddedEmailHtml(data: StakeholderAddedEmailData): string {
  const { project, partner, stakeholderRole, addedBy } = data;
  const platformUrl = 'https://partner-hub-frontend.onrender.com';

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>プロジェクト関係者として追加されました</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">プロジェクト関係者として追加されました</h1>
  </div>

  <div style="background-color: white; padding: 30px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${partner.name} 様</p>

    <p style="font-size: 15px; color: #555;">
      プロジェクトのステークホルダー（関係者）として追加されましたのでお知らせいたします。
    </p>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">${project.name}</h2>

      ${
        project.description
          ? `
      <p style="color: #555; margin: 0 0 15px 0;">${project.description}</p>
      `
          : ''
      }

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6c757d; width: 120px;">あなたの役割:</td>
          <td style="padding: 8px 0; font-weight: bold;">
            <span style="background-color: #667eea; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px;">${stakeholderRole}</span>
          </td>
        </tr>
        ${
          addedBy
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">追加者:</td>
          <td style="padding: 8px 0;">${addedBy}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <p style="font-size: 15px; color: #555;">
      プロジェクトの進捗状況を確認し、必要に応じてフィードバックをお願いいたします。
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

export function generateStakeholderAddedEmailText(data: StakeholderAddedEmailData): string {
  const { project, partner, stakeholderRole, addedBy } = data;
  const platformUrl = 'https://partner-hub-frontend.onrender.com';

  return `
${partner.name} 様

プロジェクト関係者として追加されました

=== プロジェクト情報 ===
プロジェクト名: ${project.name}
${project.description ? `説明: ${project.description}` : ''}
あなたの役割: ${stakeholderRole}
${addedBy ? `追加者: ${addedBy}` : ''}

プロジェクトURL: ${platformUrl}/projects/${project.id}

プロジェクトの進捗状況を確認し、必要に応じてフィードバックをお願いいたします。

ご不明な点がございましたら、お気軽にお問い合わせください。

---
このメールは Partner Collaboration Platform から自動送信されています。
  `.trim();
}
