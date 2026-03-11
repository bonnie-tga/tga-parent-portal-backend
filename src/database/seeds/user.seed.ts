import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import bcrypt from 'bcrypt';
import { User, UserRole } from '../../modules/users/schemas/user.schema';

@Injectable()
export class UserSeed {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  public async seed(): Promise<void> {
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

    // Check if parent user already exists
    const existingParent = await this.userModel.findOne({ email: 'parent@tga.com' });
    
    if (!existingParent) {
      // Hash the password
      const hashedPassword = await bcrypt.hash('parent123', 10);
      
      // Create parent user
      await this.userModel.create({
        firstName: 'Parent',
        lastName: 'User',
        email: 'parent@tga.com',
        password: hashedPassword,
        role: UserRole.PARENT,
        isActive: true,
      });
      
      console.log('Parent user created successfully');
    } else {
      console.log('Parent user already exists');
    }
  }
}