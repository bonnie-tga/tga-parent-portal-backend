import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MigrationService } from './migration.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Migration');
  const app = await NestFactory.create(AppModule);
  
  const migrationService = app.get(MigrationService);
  
  const command = process.argv[2];
  
  try {
    if (command === 'rollback') {
      logger.log('Rolling back the last migration...');
      await migrationService.rollbackMigration();
      logger.log('Rollback completed successfully');
    } else {
      logger.log('Running migrations...');
      await migrationService.runMigrations();
      logger.log('Migrations completed successfully');
    }
  } catch (error) {
    logger.error('Migration failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();