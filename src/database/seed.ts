import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MigrationService } from './migration.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Seed');
  const app = await NestFactory.create(AppModule);
  
  const migrationService = app.get(MigrationService);
  
  try {
    logger.log('Running migrations to seed initial data...');
    await migrationService.runMigrations();
    logger.log('Seeding completed successfully');
  } catch (error) {
    logger.error('Seeding failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();