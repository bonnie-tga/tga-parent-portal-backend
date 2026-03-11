import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { FIREBASE_ADMIN } from './firebase.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: FIREBASE_ADMIN,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<admin.app.App | null> => {
        try {
          // Reuse app if already initialized
          try {
            return admin.app();
          } catch {}

          const logger = new Logger('FirebaseModule');

          // Prefer explicit env var path if provided, else fallback to local file
          const configuredPath =
            configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH') ||
            process.env.GOOGLE_APPLICATION_CREDENTIALS ||
            path.join(process.cwd(), 'service-key.json');

          if (!configuredPath || !fs.existsSync(configuredPath)) {
            logger.warn(`Firebase service account not found at ${configuredPath}. Notifications will be disabled.`);
            return null;
          }

          const app = admin.initializeApp({
            credential: admin.credential.cert(configuredPath),
          });

          logger.log('Firebase Admin SDK initialized');
          return app;
        } catch (error) {
          const logger = new Logger('FirebaseModule');
          logger.error('Failed to initialize Firebase Admin SDK', error as Error);
          return null;
        }
      },
    },
  ],
  exports: [FIREBASE_ADMIN],
})
export class FirebaseModule {}


