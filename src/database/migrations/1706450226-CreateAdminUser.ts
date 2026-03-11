import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import bcrypt from 'bcrypt';
import { User, UserRole } from '../../modules/users/schemas/user.schema';

@Injectable()
export class CreateAdminUser {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  public async up(): Promise<void> {
    // Check if admin user already exists
    const existingAdmin = await this.userModel.findOne({ email: 'admin@tga.com' });
    
    if (!existingAdmin) {
      // Hash the password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Create admin user
      await this.userModel.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@tga.com',
        password: hashedPassword,
        role: UserRole.ADMINISTRATOR,
        isActive: true,
      });
      
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  }

  public async down(): Promise<void> {
    // Remove admin user
    await this.userModel.deleteOne({ email: 'admin@tga.com' });
    console.log('Admin user removed');
  }
}


