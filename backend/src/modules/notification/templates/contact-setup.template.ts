import { Partner } from '../../partner/entities/partner.entity';

interface ContactSetupEmailParams {
  partner: Partner;
  setupUrl: string;
  expiresAt: Date;
}

export function generateContactSetupEmailHtml(params: ContactSetupEmailParams): string {
  const { partner, setupUrl, expiresAt } = params;
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
  <title>連絡先の登録</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background-color: #3b82f6; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                Partner Hub
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">
                連絡先の登録をお願いします
              </h2>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                ${partner.name} 様
              </p>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Partner Hubをご利用いただきありがとうございます。
              </p>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                重要なご連絡が確実に届くよう、<strong>通常連絡用の方法</strong>と<strong>緊急連絡先</strong>の登録をお願いいたします。
              </p>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>登録内容：</strong><br>
                  ・通常連絡用（メールまたはLINEを選択）<br>
                  ・緊急連絡先（電話番号 - 必須）
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${setupUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px;">
                      連絡先を登録する
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                このリンクの有効期限: ${expiresAtStr}
              </p>

              <p style="margin: 24px 0 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
                ボタンがクリックできない場合は、以下のURLをブラウザに貼り付けてください：<br>
                <a href="${setupUrl}" style="color: #3b82f6; word-break: break-all;">${setupUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                このメールは Partner Hub から自動送信されています。<br>
                ご不明な点がございましたら、担当者までお問い合わせください。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function generateContactSetupEmailText(params: ContactSetupEmailParams): string {
  const { partner, setupUrl, expiresAt } = params;
  const expiresAtStr = expiresAt.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
Partner Hub - 連絡先の登録

${partner.name} 様

Partner Hubをご利用いただきありがとうございます。

重要なご連絡が確実に届くよう、通常連絡用の方法と緊急連絡先の登録をお願いいたします。

【登録内容】
・通常連絡用（メールまたはLINEを選択）
・緊急連絡先（電話番号 - 必須）

以下のURLから登録を完了してください：
${setupUrl}

このリンクの有効期限: ${expiresAtStr}

---
このメールは Partner Hub から自動送信されています。
ご不明な点がございましたら、担当者までお問い合わせください。
  `.trim();
}
