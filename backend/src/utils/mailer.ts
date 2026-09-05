import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

export class MailerService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        auth: {
          user: config.email.user,
          pass: config.email.pass
        }
      });
    }
    return this.transporter;
  }

  static async sendMail(options: { to: string; subject: string; text?: string; html?: string }): Promise<boolean> {
    try {
      if (!config.email.pass || config.email.pass === 'app-specific-password') {
        logger.info(`[MOCK EMAIL] To: ${options.to} | Subject: ${options.subject}`);
        if (options.text) logger.debug(`[MOCK EMAIL CONTENT]: ${options.text}`);
        return true;
      }

      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: config.email.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });
      logger.info(`Email successfully dispatched to ${options.to}`);
      return true;
    } catch (err: any) {
      logger.error(`Failed to send email to ${options.to}:`, err.message);
      return false;
    }
  }

  static async sendLicenseActivated(to: string, key: string, plan: string, expiresAt: Date) {
    const subject = `[CRM Restaurant] Your License Key Activated: ${plan}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h2>License Activation Successful</h2>
        <p>Your subscription is now fully active.</p>
        <p><strong>Plan:</strong> ${plan}</p>
        <p><strong>License Key:</strong> <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${key}</code></p>
        <p><strong>Valid Until:</strong> ${expiresAt.toLocaleDateString()}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size: 12px; color: #64748b;">CRM Restaurant Licensing System &copy; 2026</p>
      </div>
    `;
    return this.sendMail({ to, subject, html, text: `License ${key} activated for ${plan}. Expires: ${expiresAt}` });
  }

  static async sendSubscriptionRenewed(to: string, plan: string, expiresAt: Date) {
    const subject = `[CRM Restaurant] Subscription Successfully Renewed`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h2>Subscription Renewed</h2>
        <p>Thank you! Your restaurant CRM subscription (${plan}) has been extended.</p>
        <p><strong>New Expiration Date:</strong> ${expiresAt.toLocaleDateString()}</p>
      </div>
    `;
    return this.sendMail({ to, subject, html, text: `Subscription ${plan} renewed until ${expiresAt}` });
  }
}
