import { IsOptional, IsString, IsBoolean, IsUrl, MaxLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({ description: 'Slack Webhook URL' })
  @IsOptional()
  @ValidateIf((o) => o.slackWebhookUrl !== '' && o.slackWebhookUrl != null)
  @IsUrl({}, { message: '有効なURLを入力してください' })
  slackWebhookUrl?: string;

  @ApiPropertyOptional({ description: 'Slack通知先チャンネル名（表示用）' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slackChannelName?: string;

  @ApiPropertyOptional({ description: 'エスカレーション発生時にSlack通知するか' })
  @IsOptional()
  @IsBoolean()
  slackNotifyEscalation?: boolean;

  @ApiPropertyOptional({ description: '日次サマリーをSlack通知するか' })
  @IsOptional()
  @IsBoolean()
  slackNotifyDailySummary?: boolean;

  @ApiPropertyOptional({ description: '全てのリマインドをSlack通知するか' })
  @IsOptional()
  @IsBoolean()
  slackNotifyAllReminders?: boolean;

  @ApiPropertyOptional({ description: 'LINE Channel Access Token' })
  @IsOptional()
  @IsString()
  lineChannelAccessToken?: string;

  @ApiPropertyOptional({ description: 'LINE Channel Secret' })
  @IsOptional()
  @IsString()
  lineChannelSecret?: string;

  @ApiPropertyOptional({ description: 'Twilio Account SID' })
  @IsOptional()
  @IsString()
  twilioAccountSid?: string;

  @ApiPropertyOptional({ description: 'Twilio Auth Token' })
  @IsOptional()
  @IsString()
  twilioAuthToken?: string;

  @ApiPropertyOptional({ description: 'Twilio Phone Number' })
  @IsOptional()
  @IsString()
  twilioPhoneNumber?: string;
}
