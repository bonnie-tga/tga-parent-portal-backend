export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://root:supersecret123@31.97.115.103:27017/appdb?authSource=admin',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  mail: {
    host: process.env.MAIL_HOST || 'smtp.titan.email',
    port: parseInt(process.env.MAIL_PORT, 10) || 465,
    secure: (() => {
      const mailPort = parseInt(process.env.MAIL_PORT, 10) || 465;
      if (process.env.MAIL_SECURE !== undefined) {
        return process.env.MAIL_SECURE === 'true';
      }
      return mailPort === 465;
    })(),
    auth: {
      user: process.env.MAIL_USER || process.env.EMAIL_USER || 'noreply@loopxcorp.com',
      pass: process.env.MAIL_PASSWORD || process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD || 'Noreply@123',
    },
    defaults: {
      from: process.env.MAIL_FROM || process.env.EMAIL_USER || 'noreply@loopxcorp.com',
    },
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'https://tga.cventix.net',
  },
  notifications: {
    // Comma-separated list of recipient emails for survey-created alerts
    surveyCreatedRecipients: process.env.SURVEY_CREATED_RECIPIENTS || '',
  },
  enableSwagger: process.env.ENABLE_SWAGGER === 'true' || false,
  photoDiary: {
    downloadBaseUrl: process.env.PHOTO_DIARY_DOWNLOAD_BASE_URL || process.env.BACKEND_URL || 'http://localhost:4000/api',
    tokenTtlDays: parseInt(process.env.PHOTO_DIARY_TOKEN_TTL_DAYS, 10) || 7,
  },
});