import { logger } from '../config/logger.config';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: any;
}

export const sendEmailNotification = async (options: EmailOptions): Promise<void> => {
  // TODO: Implement with SendGrid, AWS SES, or Nodemailer
  logger.info(`[EMAIL] To: ${options.to}, Subject: ${options.subject}`);
  logger.info(`[EMAIL] Template: ${options.template}, Data:`, options.data);
  
  // For now just log, implement later with real service
  return Promise.resolve();
};
