import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateService } from './email-template.service';
import { EmailOptions } from '../interfaces/email-options.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmailMessage,
  EmailMessageDocument,
} from '../schemas/email-message.schema';
import { SendEmailDto } from '../dto/send-email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly defaultRetryConfig = {
    maxRetries: 3,
    retryDelay: 30000,
    timeout: 30000, // Increased timeout to 30 seconds
  };

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly emailTemplateService: EmailTemplateService,
    @InjectModel(EmailMessage.name)
    private emailMessageModel: Model<EmailMessageDocument>,
  ) {
    this.logger.log('Email service initialized and transporter is ready');
    const user = this.configService.get('mail.auth.user');
    const host = this.configService.get('mail.host');
    const port = this.configService.get('mail.port');
    const secure = this.configService.get('mail.secure');
    this.logger.debug(
      `Email configuration: host=${host}, port=${port}, secure=${secure}, user=${user}`,
    );
  }

  async sendEmail({
    to,
    subject,
    html,
    maxRetries = this.defaultRetryConfig.maxRetries,
    retryDelay = this.defaultRetryConfig.retryDelay,
    timeout = this.defaultRetryConfig.timeout,
    userId,
    metadata,
  }: EmailOptions & { userId?: string; metadata?: any }): Promise<boolean> {
    let lastError: Error;
    let emailMessage: EmailMessageDocument | null = null;

    try {
      emailMessage = new this.emailMessageModel({
        userId: userId ? new Types.ObjectId(userId) : undefined,
        to,
        subject,
        message: html,
        isSent: false,
        metadata,
      });
      await emailMessage.save();
    } catch (error) {
      this.logger.warn(`Failed to save email message to DB: ${error.message}`);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`Email attempt ${attempt}/${maxRetries} to ${to}`);

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  `Email timeout after ${timeout / 1000} seconds (attempt ${attempt})`,
                ),
              ),
            timeout,
          );
        });

        await Promise.race([
          this.mailerService.sendMail({
            to,
            subject,
            html,
            from: this.configService.get('mail.defaults.from'),
          }),
          timeoutPromise,
        ]);

        this.logger.log(
          `Email sent successfully to ${to} on attempt ${attempt}`,
        );

        if (emailMessage) {
          emailMessage.isSent = true;
          emailMessage.error = undefined;
          emailMessage.errorDetails = undefined;
          await emailMessage.save();
        }

        return true;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Email failed attempt ${attempt}: ${error.message}`, {
          error: error.stack,
          host: this.configService.get('mail.host'),
          port: this.configService.get('mail.port'),
          secure: this.configService.get('mail.secure'),
        });

        if (attempt < maxRetries) {
          this.logger.debug(`Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    this.logger.error(`All ${maxRetries} email attempts failed for ${to}`, {
      error: lastError.message,
      stack: lastError.stack,
      host: this.configService.get('mail.host'),
      port: this.configService.get('mail.port'),
      secure: this.configService.get('mail.secure'),
    });

    if (emailMessage) {
      emailMessage.isSent = false;
      emailMessage.error = lastError.message;
      emailMessage.errorDetails = lastError.stack;
      await emailMessage.save();
    }

    return false;
  }

  async sendSetPasswordEmail(
    email: string,
    token: string,
    name: string,
  ): Promise<boolean> {
    this.logger.debug(`Sending set password email to ${email}`);
    const html = this.emailTemplateService.getSetPasswordTemplate(
      name,
      token,
      email,
    );
    return this.sendEmail({ to: email, subject: 'Set your password', html });
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    name: string,
  ): Promise<boolean> {
    this.logger.debug(`Sending verification email to ${email}`);
    const html = this.emailTemplateService.getVerificationEmailTemplate(
      name,
      token,
    );
    return this.sendEmail({ to: email, subject: 'Verify your email', html });
  }

  async sendForgotPasswordEmail(
    email: string,
    token: string,
    name: string,
  ): Promise<boolean> {
    this.logger.debug(`Sending password reset email to ${email}`);
    const html = this.emailTemplateService.getForgotPasswordTemplate(
      name,
      token,
    );
    return this.sendEmail({ to: email, subject: 'Reset your password', html });
  }

  async sendPasswordSetEmail(email: string, name: string): Promise<boolean> {
    this.logger.debug(`Sending password set email to ${email}`);
    const html = this.emailTemplateService.getPasswordSetTemplate(name);
    return this.sendEmail({
      to: email,
      subject: 'Password Set Successfully',
      html,
    });
  }

  async sendPasswordChangedEmail(
    email: string,
    name: string,
  ): Promise<boolean> {
    this.logger.debug(`Sending password changed email to ${email}`);
    const html = this.emailTemplateService.getPasswordChangedTemplate(name);
    return this.sendEmail({
      to: email,
      subject: 'Password Changed Successfully',
      html,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    this.logger.debug(`Sending welcome email to ${email}`);
    const html = this.emailTemplateService.getWelcomeTemplate(name);
    return this.sendEmail({
      to: email,
      subject: 'Welcome to TGA Parent Portal!',
      html,
    });
  }

  async sendImmunisationReminderEmail(
    email: string,
    parentName: string,
    childName: string,
    reminderType: string,
  ): Promise<boolean> {
    this.logger.debug(`Sending immunisation reminder email to ${email}`);
    const html = this.emailTemplateService.getImmunisationReminderTemplate(
      parentName,
      childName,
      reminderType,
    );
    return this.sendEmail({
      to: email,
      subject: `Immunisation Reminder: ${childName} - ${reminderType}`,
      html,
    });
  }

  async sendWelcomeForUser(email: string, name: string): Promise<boolean> {
    this.logger.debug(`Sending welcome email to ${email}`);
    const html = this.emailTemplateService.getWelcomeForUserTemplate(name);
    return this.sendEmail({
      to: email,
      subject: 'Welcome to TGA Parent Portal!',
      html,
    });
  }

  async sendPhotoDiaryDownloadEmail(
    email: string,
    downloadUrl: string,
    expiresAt?: Date,
    mediaCount?: number,
    photoId?: string,
  ): Promise<boolean> {
    this.logger.debug(`Sending photo diary download email to ${email}`);
    const html = this.emailTemplateService.getPhotoDiaryDownloadTemplate(
      downloadUrl,
      expiresAt,
      mediaCount,
    );
    return this.sendEmail({
      to: email,
      subject: 'Photo Diary Download Ready',
      html,
      metadata: {
        type: 'photo-diary-download',
        photoId,
        downloadUrl,
        expiresAt,
        mediaCount,
      },
    });
  }

  async sendMagicLinkEmail(
    email: string,
    token: string,
    name: string,
    redirectUrl: string,
  ): Promise<boolean> {
    this.logger.debug(`Sending magic link email to ${email}`);
    const html = this.emailTemplateService.getMagicLinkTemplate(
      name,
      token,
      redirectUrl,
    );
    return this.sendEmail({ to: email, subject: 'Login Link', html });
  }

  async sendStageChangeEmail(
    email: string,
    id: string,
    name: string,
    newStageName: string,
  ): Promise<boolean> {
    this.logger.debug(`Sending stage change email to ${email}`);
    const html = await this.emailTemplateService.getStageChangeTemplate(
      id,
      name,
      newStageName,
    );
    return this.sendEmail({
      to: email,
      subject: 'Your Application Status Update',
      html,
    });
  }

  async sendSurveyCreatedNotification(surveyTitle: string): Promise<void> {
    const configured = this.configService.get<string>(
      'notifications.surveyCreatedRecipients',
    );
    const recipients = configured
      ? configured
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
      : ['noreply@loopxcorp.com', 'noreply+1@loopxcorp.com'];

    const subject = `New Survey Created: ${surveyTitle}`;
    const html =
      this.emailTemplateService.getSurveyCreatedTemplate(surveyTitle);

    await Promise.all(
      recipients.map((to) =>
        this.sendEmail({ to, subject, html }).catch((err) => {
          this.logger.warn(
            `Failed to send survey-created email to ${to}: ${err?.message}`,
          );
          return false;
        }),
      ),
    );
  }

  async sendCustomEmail(
    dto: SendEmailDto,
    userId: string,
  ): Promise<EmailMessage> {
    try {
      const isSent = await this.sendEmail({
        to: dto.to,
        subject: dto.subject,
        html: dto.message,
        userId,
      });

      const emailMessage = await this.emailMessageModel
        .findOne({ to: dto.to, subject: dto.subject })
        .sort({ createdAt: -1 })
        .exec();

      if (emailMessage) {
        this.logger.log(`Email sent successfully to ${dto.to}`);
        return emailMessage;
      }

      throw new Error('Email message not found in database');
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  async getAllEmailMessages(userId: string): Promise<EmailMessage[]> {
    return this.emailMessageModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();
  }
}
