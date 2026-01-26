import { Partner } from '../../partner/entities/partner.entity';

export interface PartnerInvitationEmailData {
  partner: Partner;
  invitationUrl: string;
  expiresAt: Date;
  invitedBy?: string;
}

export function generatePartnerInvitationEmailHtml(data: PartnerInvitationEmailData): string {
  const { partner, invitationUrl, expiresAt, invitedBy } = data;
  const expiresAtStr = expiresAt.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partner Hub への招待</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Partner Hub への招待</h1>
  </div>

  <div style="background-color: white; padding: 30px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${partner.name} 様</p>

    <p style="font-size: 15px; color: #555;">
      Partner Collaboration Platform へのパートナー登録が完了しました。<br>
      下のボタンをクリックしてアカウントを有効化してください。
    </p>

    ${invitedBy ? `
    <p style="font-size: 14px; color: #6c757d;">
      招待者: ${invitedBy}
    </p>
    ` : ''}

    <div style="margin: 30px 0; text-align: center;">
      <a href="${invitationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
        アカウントを有効化する
      </a>
    </div>

    <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>注意:</strong> このリンクの有効期限は <strong>${expiresAtStr}</strong> までです。
      </p>
    </div>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #495057; font-size: 16px;">登録情報</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6c757d; width: 100px;">お名前:</td>
          <td style="padding: 8px 0;">${partner.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">メール:</td>
          <td style="padding: 8px 0;">${partner.email}</td>
        </tr>
        ${partner.companyName ? `
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">会社名:</td>
          <td style="padding: 8px 0;">${partner.companyName}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p style="font-size: 14px; color: #6c757d;">
      このリンクをクリックできない場合は、以下のURLをブラウザに貼り付けてください:<br>
      <span style="word-break: break-all; color: #667eea;">${invitationUrl}</span>
    </p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
      <p style="color: #6c757d; font-size: 14px; margin: 0;">
        ご不明な点がございましたら、お気軽にお問い合わせください。
      </p>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
    <p>このメールは Partner Collaboration Platform から自動送信されています。</p>
    <p>このメールに心当たりがない場合は、無視してください。</p>
  </div>
</body>
</html>
  `.trim();
}

export function generatePartnerInvitationEmailText(data: PartnerInvitationEmailData): string {
  const { partner, invitationUrl, expiresAt, invitedBy } = data;
  const expiresAtStr = expiresAt.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
${partner.name} 様

Partner Hub への招待

Partner Collaboration Platform へのパートナー登録が完了しました。
以下のリンクをクリックしてアカウントを有効化してください。

${invitationUrl}

${invitedBy ? `招待者: ${invitedBy}` : ''}

【注意】このリンクの有効期限は ${expiresAtStr} までです。

=== 登録情報 ===
お名前: ${partner.name}
メール: ${partner.email}
${partner.companyName ? `会社名: ${partner.companyName}` : ''}

ご不明な点がございましたら、お気軽にお問い合わせください。

---
このメールは Partner Collaboration Platform から自動送信されています。
このメールに心当たりがない場合は、無視してください。
  `.trim();
}
