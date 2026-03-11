import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ChangeDetailsStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum ChangeDetailsDecisionStatus {
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
}

export enum ChangeDetailsEmergencyType {
  EMERGENCY_CONTACT = 'Emergency Contact',
  AUTHORITY_TO_COLLECT = 'Authority to Collect',
}

export enum ChangeDetailsEmergencyAction {
  ADD = 'Add',
  REMOVE = 'Remove',
}

@Schema({ _id: false })
export class EmergencyContact {
  @Prop({ type: String, required: false })
  name?: string;

  @Prop({ type: String, required: false })
  relationship?: string;

  @Prop({ type: String, required: false })
  phoneNumber?: string;

  @Prop({ type: String, required: false })
  address?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Child', required: false })
  children?: Types.ObjectId[];

  @Prop({
    type: String,
    enum: Object.values(ChangeDetailsEmergencyType),
    required: false,
  })
  emergencyType?: ChangeDetailsEmergencyType;

  @Prop({
    type: String,
    enum: Object.values(ChangeDetailsEmergencyAction),
    required: false,
  })
  emergencyAction?: ChangeDetailsEmergencyAction;
}

@Schema({ timestamps: true, collection: 'change_details' })
export class ChangeDetails extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: false })
  room?: Types.ObjectId;

  @Prop({ type: String, required: false })
  newAddress?: string;

  @Prop({ type: String, required: false })
  newPhoneNumber?: string;

  @Prop({ type: EmergencyContact, required: false })
  emergencyContact?: EmergencyContact;

 @Prop({ type: Boolean, required: false })
 addOrRemoveEmergencyContact?: boolean;

  @Prop({ type: EmergencyContact, required: false })
  additionalEmergencyContact?: EmergencyContact;

  @Prop({
    type: String,
    enum: Object.values(ChangeDetailsStatus),
    default: ChangeDetailsStatus.DRAFT,
  })
  status!: ChangeDetailsStatus;

  @Prop({
    type: String,
    enum: Object.values(ChangeDetailsDecisionStatus),
    default: ChangeDetailsDecisionStatus.PENDING,
    required: false,
  })
  decisionStatus?: ChangeDetailsDecisionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submittedBy!: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const ChangeDetailsSchema = SchemaFactory.createForClass(ChangeDetails);


