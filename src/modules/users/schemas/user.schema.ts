import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

/**
 * Enum defining all possible user roles in the system
 */
export enum UserRole {
  ADMINISTRATOR = 'administrator',
  AREA_MANAGER = 'area_manager',
  DIRECTOR = 'director',
  ASSISTANT_DIRECTOR = 'assistant_director',
  EDUCATIONAL_LEADER = 'educational_leader',
  ENROLMENTS = 'enrolments',
  WHS_MEDICAL = 'whs_medical',
  CENTRE_LOGIN = 'centre_login',
  ROOM_LOGIN = 'room_login',
  STAFF = 'staff',
  TEACHER = 'teacher',
  PARENT = 'parent',
}

/**
 * Enum defining the scope of access for a user
 */
export enum AccessScope {
  ALL = 'all', // Can access everything
  MULTIPLE_CAMPUS = 'multiple_campus', // Can access multiple campuses
  SINGLE_CAMPUS = 'single_campus', // Can access a single campus
  SINGLE_ROOM = 'single_room', // Can access a single room
  OWN_CHILDREN = 'own_children', // Can only access own children
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: false })
  email?: string;

  @Prop({ required: false })
  username?: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: Object.values(UserRole), required: true })
  role: UserRole;

  @Prop({
    type: String,
    enum: Object.values(AccessScope),
    required: true,
    default: AccessScope.SINGLE_CAMPUS,
  })
  accessScope: AccessScope;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Campus' }],
    default: [],
  })
  campuses: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Room' }],
    default: [],
  })
  rooms: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Child' }],
    default: [],
  })
  children: MongooseSchema.Types.ObjectId[];

  // Permissions are now managed by the frontend
  // This field is kept for backward compatibility
  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: [String], default: [] }) mediaUrls: string[];

  @Prop({ type: Date, default: null })
  lastLogin: Date;

  @Prop({ type: String, default: null })
  resetPasswordToken: string;

  @Prop({ type: Date, default: null })
  resetPasswordExpires: Date;

  @Prop({ type: String, default: null })
  setPasswordToken: string;

  @Prop({ type: Date, default: null })
  setPasswordExpires: Date;

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;

  @Prop({ type: Boolean, default: false })
  isSharedAccount: boolean;

  @Prop({ type: String, default: null })
  refreshToken: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: String, default: null })
  fcmToken: string;

  @Prop({ type: Boolean, default: false })
  notificationsEnabled: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
