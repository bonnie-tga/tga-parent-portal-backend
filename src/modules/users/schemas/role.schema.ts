import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole, AccessScope } from './user.schema';

@Schema({ timestamps: true })
export class Role extends Document {
  // Timestamp fields that will be automatically managed by Mongoose
  createdAt: Date;
  updatedAt: Date;
  @Prop({ 
    required: true, 
    unique: true, 
    type: String, 
    enum: Object.values(UserRole)
  })
  name: UserRole;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  permissions: number;

  @Prop({ type: [String], default: [] })
  permissionStrings: string[];

  @Prop({ 
    type: String, 
    enum: Object.values(AccessScope), 
    required: true 
  })
  accessScope: AccessScope;

  @Prop({ type: Boolean, default: true })
  isSystemRole: boolean;

  @Prop({ type: [Object], default: [] })
  details: {
    category: string;
    permission: string;
    description: string;
  }[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
