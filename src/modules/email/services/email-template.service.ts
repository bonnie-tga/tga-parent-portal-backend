import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailTemplateService {
  private logoBase64: string;

  constructor(private readonly configService: ConfigService) {
    // Load and encode the logo on service initialization
    try {
      // Try multiple possible paths for the logo file
      let logoPath;
      const possiblePaths = [
        path.join(process.cwd(), 'src', 'public', 'tga-portal-logo.svg'),
        path.join(process.cwd(), 'dist', 'public', 'tga-portal-logo.svg'),
        path.join(process.cwd(), 'public', 'tga-portal-logo.svg'),
      ];

      // Try each path until we find one that exists
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          logoPath = p;
          break;
        }
      }

      if (!logoPath) {
        throw new Error('Logo file not found in any of the expected locations');
      }

      const logoBuffer = fs.readFileSync(logoPath);
      this.logoBase64 = `data:image/svg+xml;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
      console.error('Error loading logo:', error);
      // Fallback to a text-based logo if image loading fails
      this.logoBase64 = '';
    }
  }

  private getHeader(title: string): string {
    const baseUrl =
      this.configService.get<string>('frontend.url') || 'https://tga.cventix.net';
    // Use base64 encoded image that will work in all email clients
    return `
      <!-- Header -->
      <div style="text-align: center; background-color: #e9ecef; padding: 36px 24px 0px;">
        <a href="${baseUrl}" target="_blank" style="display: inline-block;">
          ${this.logoBase64 ? `<img src="${this.logoBase64}" alt="TGA Parent Portal" width="120" style="max-width: 100%; height: auto;">` : '<span style="font-size: 24px; font-weight: bold;">TGA Parent Portal</span>'}
        </a>
        <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;">${title}</h1>
      </div>`;
  }

  private getActionButton(url: string, text: string): string {
    return `
      <!-- Button -->
      <div style="text-align: center; background-color: #e9ecef; padding: 12px;">
        <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: #1a82e2;">${text}</a>
      </div>
      <!-- Copy -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">If that doesn't work, copy and paste the following link in your browser:</p>
        <p style="margin: 0;"><a href="${url}" target="_blank" style="color: #1a82e2; text-decoration: none;">${url}</a></p>
      </div>`;
  }

  private getFooter(message: string): string {
    return `
      <!-- Footer -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #666;">${message}</p>
        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #666;">TGA Parent Portal, Sydney, Australia</p>
      </div>`;
  }

  getSetPasswordTemplate(name: string, token: string, email: string): string {
    const firstName = name.split(' ')[0];
    const baseUrl =
      this.configService.get<string>('frontend.url') ||
      'https://tga.cventix.net' ||
      'http://localhost:3000';
    const actionUrl = `${baseUrl}/auth/set-password?token=${token}&email=${email}`;

    const content = `
      ${this.getHeader('Welcome to TGA Parent Portal')}
      <!-- Copy Block -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">Hi ${firstName}!</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">Your account has been created by the admin. Please set your new password by clicking the button below.</p>
      </div>
      ${this.getActionButton(actionUrl, 'Set New Password')}
      ${this.getFooter('If you did not expect this email, you can safely ignore it.')}`;

    return this.getEmailWrapper(content);
  }

  getPasswordSetTemplate(name: string): string {
    const firstName = name.split(' ')[0];
    const baseUrl =
      this.configService.get<string>('frontend.url') || 'https://tga.cventix.net';
    const actionUrl = `${baseUrl}/auth`;

    const content = `
      ${this.getHeader('Password Set Successfully')}
      <!-- Copy Block -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">Hi ${firstName},</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">
          Your password has been set successfully. You can now log in to your account using your new password.
        </p>
      </div>
      ${this.getActionButton(actionUrl, 'Login Now')}
      ${this.getFooter('If you didn’t perform this action, please contact our support team immediately.')}
    `;

    return this.getEmailWrapper(content);
  }

  getPasswordChangedTemplate(name: string): string {
    const firstName = name.split(' ')[0];
    const baseUrl =
      this.configService.get<string>('frontend.url') || 'https://tga.cventix.net';
    const actionUrl = `${baseUrl}/auth`;

    const content = `
      ${this.getHeader('Password Changed Successfully')}
      <!-- Copy Block -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">Hi ${firstName},</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">
          Your password has been changed successfully. You can now log in to your account using your new password.
        </p>
      </div>
      ${this.getActionButton(actionUrl, 'Login Now')}
      ${this.getFooter('If you didn’t perform this action, please contact our support team immediately.')}
    `;

    return this.getEmailWrapper(content);
  }

  getPhotoDiaryDownloadTemplate(
    downloadUrl: string,
    expiresAt?: Date,
    mediaCount?: number,
  ): string {
    const countSection =
      mediaCount != null
        ? `<p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">We have prepared ${mediaCount} ${mediaCount === 1 ? 'file' : 'files'} for you.</p>`
        : '';
    const expirySection =
      expiresAt != null
        ? `<p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">This link expires on ${expiresAt.toLocaleString(
            'en-AU',
            {
              dateStyle: 'long',
              timeStyle: 'short',
            },
          )}.</p>`
        : '';
    const content = `
      ${this.getHeader('Photo Diary Download Ready')}
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">Your photo diary download is ready.</p>
        ${countSection}
        ${expirySection}
      </div>
      ${this.getActionButton(downloadUrl, 'Download Photos')}
      ${this.getFooter('If you need assistance, please contact your campus team.')}`;

    return this.getEmailWrapper(content);
  }

  private getEmailWrapper(content: string): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="x-ua-compatible" content="ie=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        *:link, *:visited {
          text-decoration: none;
        }
      </style>
    </head>
    <body style="background-color: #e9ecef; margin: 0; padding: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;">
      ${content}
    </body>
    </html>`;
  }

  getVerificationEmailTemplate(name: string, token: string): string {
    const firstName = name.split(' ')[0];
    const baseUrl =
      this.configService.get<string>('frontend.url') || 'https://tga.cventix.net';
    const actionUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    const content = `
      ${this.getHeader('Verify your email')}
      <!-- Main Content -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">Hi ${firstName}!</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">Please verify your email address to complete your registration.</p>
      </div>
      ${this.getActionButton(actionUrl, 'Verify Email')}
      ${this.getFooter("If you didn't create an account with TGA Parent Portal, you can safely ignore this email.")}`;

    return this.getEmailWrapper(content);
  }

  getForgotPasswordTemplate(name: string, token: string): string {
    const firstName = name.split(' ')[0];
    const baseUrl =
      this.configService.get<string>('frontend.url') || 'https://tga.cventix.net';
    const actionUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    const content = `
      ${this.getHeader('Reset your password')}
      <!-- Copy Block -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">Hi ${firstName}!</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">We received a request to reset your password. Click the button below to choose a new password.</p>
      </div>
      ${this.getActionButton(actionUrl, 'Reset Password')}
      ${this.getFooter("If you didn't request a password reset, you can safely ignore this email.")}`;

    return this.getEmailWrapper(content);
  }

  getWelcomeTemplate(name: string): string {
    const firstName = name.split(' ')[0];
    const baseUrl =
      this.configService.get<string>('frontend.url') || 'https://tga.cventix.net';
    const actionUrl = `${baseUrl}/auth`;

    const content = `
      ${this.getHeader('Welcome to TGA Parent Portal!')}
      <!-- Copy Block -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">Hi ${firstName}!</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">Thank you for verifying your email. Your account is now active and ready to use.</p>
      </div>
      ${this.getActionButton(actionUrl, 'Login Now')}
      ${this.getFooter('Welcome to the TGA Parent Portal!')}`;

    return this.getEmailWrapper(content);
  }



  getImmunisationReminderTemplate(
    parentName: string,
    childName: string,
    reminderType: string,
  ): string {
    const firstName = parentName.split(' ')[0];
    const baseUrl =
      this.configService.get<string>('frontend.url') || 'https://tga.cventix.net';

    const content = `
      ${this.getHeader('Immunisation Reminder: Your Child is Due for Immunisation')}
      <!-- Copy Block -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">Hi ${firstName}!</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">
          This is a reminder that <strong>${childName}</strong> is due for their <strong>${reminderType}</strong> immunisation.
        </p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">
          Please ensure your child's immunisations are up to date to avoid cancellation of your child care subsidy.
        </p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">
          You can respond to this reminder in the News Feed section of the TGA Parent Portal.
        </p>
      </div>
      ${this.getFooter('If you need assistance, please contact your campus team.')}`;

    return this.getEmailWrapper(content);
  }

  getWelcomeForUserTemplate(name: string): string {
    const firstName = name.split(' ')[0];
    const baseUrl =
      this.configService.get<string>('frontend.url') || 'https://tga.cventix.net';
    const actionUrl = `${baseUrl}/auth`;

    const content = `
      ${this.getHeader('Welcome to TGA Parent Portal')}
      <!-- Copy Block -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">Dear ${firstName},</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">Your account has been successfully created. You now have access to the CNO HR Portal where you can view and manage employee information.</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">Please click the button below to access your account.</p>
      </div>
      ${this.getActionButton(actionUrl, 'Access Portal')}
      ${this.getFooter('Thank you for using the TGA Parent Portal.')}`;

    return this.getEmailWrapper(content);
  }

  getSurveyCreatedTemplate(surveyTitle: string): string {
    const baseUrl =
      this.configService.get<string>('frontend.url') || 'https://tga.cventix.net';
    const actionUrl = `${baseUrl}/auth`;

    const content = `
      ${this.getHeader('New Survey Created')}
      <!-- Copy Block -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">
          A new survey has been created.
        </p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">
          <strong>Title:</strong> ${surveyTitle}
        </p>
      </div>
      ${this.getActionButton(actionUrl, 'View Surveys')}
      ${this.getFooter('You are receiving this because survey creation alerts are enabled.')}
    `;

    return this.getEmailWrapper(content);
  }

  getMagicLinkTemplate(
    name: string,
    token: string,
    redirectUrl: string,
  ): string {
    const firstName = name.split(' ')[0];
    const actionUrl = `${redirectUrl}?token=${token}`;

    const content = `
      ${this.getHeader('Secure Access Link - TGA Parent Portal')}
      <!-- Copy Block -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">Dear ${firstName},</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">You have requested secure access to the CNO HR Portal. Please use the button below to securely access your account.</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">For security purposes, this link will expire in 15 minutes from the time of request.</p>
      </div>
      ${this.getActionButton(actionUrl, 'Access Portal')}
      ${this.getFooter('If you did not request this access link, please contact your system administrator immediately.')}`;

    return this.getEmailWrapper(content);
  }

  async getStageChangeTemplate(
    name: string,
    newStageName: string,
    id: string,
  ): Promise<string> {
    const firstName = name.split(' ')[0];
    const baseUrl =
      this.configService.get<string>('frontend.url') || 'https://tga.cventix.net';
    const actionUrl = `${baseUrl}/candidates/${id}`;

    const content = `
      ${this.getHeader('Application Status Update')}
      <!-- Copy Block -->
      <div style="text-align: center; background-color: #e9ecef; padding: 24px;">
        <p style="margin: 0; font-size: 16px; line-height: 24px;">Hi ${firstName}!</p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">Your application has been moved to the next stage: <strong>${newStageName}</strong></p>
        <p style="margin: 12px 0 0; font-size: 16px; line-height: 24px;">We will keep you updated on any further progress.</p>
      </div>
      ${this.getActionButton(actionUrl, 'View Application')}
      ${this.getFooter("If you didn't apply to TGA Parent Portal, you can safely ignore this email.")}`;

    return this.getEmailWrapper(content);
  }
}
