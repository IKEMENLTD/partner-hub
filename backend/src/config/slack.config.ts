import { registerAs } from '@nestjs/config';

export interface SlackConfig {
  botToken: string;
  signingSecret: string;
  isDevelopment: boolean;
  defaultChannel: string;
}

export default registerAs(
  'slack',
  (): SlackConfig => ({
    botToken: process.env.SLACK_BOT_TOKEN || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    isDevelopment: process.env.NODE_ENV !== 'production',
    defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '',
  }),
);
