import { Partner } from '../../partner/entities/partner.entity';

interface ReportUrlEmailParams {
  partner: Partner;
  reportUrl: string;
}

export function generateReportUrlEmailHtml(params: ReportUrlEmailParams): string {
  const { partner, reportUrl } = params;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>進捗報告用URLのご案内</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Partner Hub</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">パートナー協業プラットフォーム</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 20px; font-weight: 600;">
                進捗報告用URLのご案内
              </h2>

              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                ${partner.name} 様
              </p>

              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Partner Hubにパートナーとして登録いただきました。<br>
                以下のURLから、ログインなしで進捗報告ができます。
              </p>

              <!-- Report URL Box -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 15px; color: #333333; font-size: 14px; font-weight: 600;">
                  📝 進捗報告用URL
                </p>
                <a href="${reportUrl}" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                  報告ページを開く
                </a>
              </div>

              <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 6px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⚠️ このURLはあなた専用です。他の方と共有しないでください。
                </p>
              </div>

              <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                <strong>このURLでできること：</strong>
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                <li>担当案件への進捗報告</li>
                <li>課題・問題の報告</li>
                <li>完了報告</li>
                <li>過去の報告履歴の確認</li>
              </ul>

              <p style="margin: 30px 0 0; color: #999999; font-size: 13px; line-height: 1.6;">
                ※ このURLはブックマークに保存しておくと便利です。<br>
                ※ URLを紛失した場合は、担当者にお問い合わせください。
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                このメールはPartner Hubから自動送信されています。<br>
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
  `.trim();
}

export function generateReportUrlEmailText(params: ReportUrlEmailParams): string {
  const { partner, reportUrl } = params;

  return `
【Partner Hub】進捗報告用URLのご案内

${partner.name} 様

Partner Hubにパートナーとして登録いただきました。
以下のURLから、ログインなしで進捗報告ができます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 進捗報告用URL
${reportUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ このURLはあなた専用です。他の方と共有しないでください。

【このURLでできること】
・担当案件への進捗報告
・課題・問題の報告
・完了報告
・過去の報告履歴の確認

※ このURLはブックマークに保存しておくと便利です。
※ URLを紛失した場合は、担当者にお問い合わせください。

──────────────────────────────────────
このメールはPartner Hubから自動送信されています。
ご不明な点がございましたら、担当者までお問い合わせください。
  `.trim();
}
