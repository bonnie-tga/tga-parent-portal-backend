import { Db } from 'mongodb';
import { Logger } from '@nestjs/common';

export const up = async (db: Db) => {
  const logger = new Logger('CreateUsersTable');
  try {
    // Create users collection with schema validation
    await db.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'name', 'password', 'role', 'emailVerified'],
          properties: {
            email: {
              bsonType: 'string',
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
            },
            name: {
              bsonType: 'string',
              minLength: 2
            },
            password: {
              bsonType: 'string',
              minLength: 8
            },
            role: {
              enum: ['ADMIN', 'USER', 'MANAGER']
            },
            emailVerified: {
              bsonType: 'bool'
            }
          }
        }
      }
    });

    // Create indexes
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { role: 1, isActive: 1 } },
      { key: { email: 'text' } },
      { key: { verificationToken: 1 }, sparse: true },
      { key: { resetPasswordToken: 1 }, sparse: true }
    ]);

    logger.log('Users collection created with indexes');
  } catch (error) {
    logger.error('Error creating users collection:', error);
    throw error;
  }
};

export const down = async (db: Db) => {
  const logger = new Logger('CreateUsersTable');
  try {
    await db.collection('users').drop();
    logger.log('Users collection dropped');
  } catch (error) {
    logger.error('Error dropping users collection:', error);
    throw error;
  }
};
