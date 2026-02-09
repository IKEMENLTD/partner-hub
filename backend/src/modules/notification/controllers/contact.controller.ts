import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmailService } from '../services/email.service';
import { ContactInquiryDto } from '../dto/contact-inquiry.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserProfile } from '../../auth/entities/user-profile.entity';

@ApiTags('contact')
@ApiBearerAuth()
@Controller('contact')
export class ContactController {
  private readonly SUPPORT_EMAIL = 'kumamoto@ikemen.ltd';

  constructor(private readonly emailService: EmailService) {}

  @Post('inquiry')
  @ApiOperation({ summary: 'お問い合わせ送信' })
  async sendInquiry(
    @Body() dto: ContactInquiryDto,
    @CurrentUser() user: UserProfile,
  ): Promise<{ success: boolean }> {
    const html = `
      <h2>お問い合わせがありました</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 120px;">お名前</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${this.escapeHtml(dto.name)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">メール</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${this.escapeHtml(dto.email)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">ユーザーID</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${user.id}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">件名</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${this.escapeHtml(dto.subject)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">内容</td>
          <td style="padding: 8px; border: 1px solid #ddd; white-space: pre-wrap;">${this.escapeHtml(dto.message)}</td>
        </tr>
      </table>
    `;

    await this.emailService.sendEmail({
      to: this.SUPPORT_EMAIL,
      subject: `【お問い合わせ】${dto.subject}`,
      html,
    });

    return { success: true };
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
