import { logger } from '../config/logger.config';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: any;
}

export const sendEmailNotification = async (options: EmailOptions): Promise<void> => {
  logger.info(`[EMAIL] To: ${options.to}, Subject: ${options.subject}`);
  logger.info(`[EMAIL] Template: ${options.template}, Data:`, options.data);
  
  // TODO: Implementar con SendGrid, AWS SES, o Nodemailer
  return Promise.resolve();
};
