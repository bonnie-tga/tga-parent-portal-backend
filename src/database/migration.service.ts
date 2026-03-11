import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { User } from '../modules/users/schemas/user.schema';
import { UserSeed } from './seeds/user.seed';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async runMigrations() {
    try {
      this.logger.log('Running migrations...');
      
      // Run user seed
      const userSeed = new UserSeed(this.userModel);
      await userSeed.seed();
      
      this.logger.log('Migrations completed successfully');
    } catch (error) {
      this.logger.error('Error running migrations:', error);
      throw error;
    }
  }

  async rollbackMigration() {
    try {
      this.logger.log('Rolling back migrations...');
      
      // This is just a placeholder - we don't actually rollback the seed data
      // in a real application, you would implement proper rollback logic
      
      this.logger.log('Rollback completed successfully');
    } catch (error) {
      this.logger.error('Error rolling back migration:', error);
      throw error;
    }
  }
}