import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailService } from './services/email.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailMessage, EmailMessageSchema } from './schemas/email-message.schema';
import { EmailController } from './controllers/email.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: EmailMessage.name, schema: EmailMessageSchema }
    ]),
    MailerModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: {
            host: configService.get('mail.host'),
            port: configService.get('mail.port'),
            secure: configService.get('mail.secure'),
            requireTLS: !configService.get('mail.secure'),
            auth: {
              user: configService.get('mail.auth.user'),
              pass: configService.get('mail.auth.pass'),
            },
            connectionTimeout: 60000,
            greetingTimeout: 30000,
            socketTimeout: 60000,
            tls: {
              rejectUnauthorized: false,
            },
          },
          defaults: {
            from: configService.get('mail.defaults.from'),
          },
        }),
        inject: [ConfigService],
      }),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailTemplateService],
  exports: [EmailService],
})
export class EmailModule {}