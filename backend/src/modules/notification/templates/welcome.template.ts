import { Partner } from '../../partner/entities/partner.entity';

export interface WelcomeEmailData {
  partner: Partner;
  loginUrl?: string;
}

export function generateWelcomeEmailHtml(data: WelcomeEmailData): string {
  const { partner, loginUrl } = data;
  const platformUrl = loginUrl || 'https://partner-hub-frontend.onrender.com';

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partner Hub へようこそ</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Partner Hub へようこそ！</h1>
  </div>

  <div style="background-color: white; padding: 30px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${partner.name} 様</p>

    <p style="font-size: 15px; color: #555;">
      Partner Collaboration Platform へのご登録ありがとうございます。<br>
      パートナーとしてご登録いただきました。
    </p>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #495057;">登録情報</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6c757d; width: 120px;">お名前:</td>
          <td style="padding: 8px 0; font-weight: bold;">${partner.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">メール:</td>
          <td style="padding: 8px 0;">${partner.email}</td>
        </tr>
        ${
          partner.companyName
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">会社名:</td>
          <td style="padding: 8px 0;">${partner.companyName}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <p style="font-size: 15px; color: #555;">
      今後、案件のご依頼やタスクの進捗確認などのご連絡をお送りいたします。
    </p>

    <div style="margin-top: 30px; text-align: center;">
      <a href="${platformUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        プラットフォームにアクセス
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

export function generateWelcomeEmailText(data: WelcomeEmailData): string {
  const { partner, loginUrl } = data;
  const platformUrl = loginUrl || 'https://partner-hub-frontend.onrender.com';

  return `
${partner.name} 様

Partner Hub へようこそ！

Partner Collaboration Platform へのご登録ありがとうございます。
パートナーとしてご登録いただきました。

=== 登録情報 ===
お名前: ${partner.name}
メール: ${partner.email}
${partner.companyName ? `会社名: ${partner.companyName}` : ''}

今後、案件のご依頼やタスクの進捗確認などのご連絡をお送りいたします。

プラットフォームURL: ${platformUrl}

ご不明な点がございましたら、お気軽にお問い合わせください。

---
このメールは Partner Collaboration Platform から自動送信されています。
  `.trim();
}
