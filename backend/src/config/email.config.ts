import { registerAs } from '@nestjs/config';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
  enabled: boolean;
}

export default registerAs(
  'email',
  (): EmailConfig => ({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@example.com',
    fromName: process.env.SMTP_FROM_NAME || 'Partner Collaboration Platform',
    // Disable email sending in development environment (console output only)
    enabled: process.env.NODE_ENV === 'production' && !!process.env.SMTP_HOST,
  }),
);
