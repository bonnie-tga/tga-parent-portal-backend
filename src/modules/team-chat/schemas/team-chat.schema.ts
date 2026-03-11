import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum TeamChatStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum TeamChatDecisionStatus {
  OPEN = 'Open',
  CLOSE = 'Close',
}

@Schema({ timestamps: true, collection: 'team_chats' })
export class TeamChat extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  members: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: String,
    enum: Object.values(TeamChatStatus),
    default: TeamChatStatus.DRAFT,
  })
  status: TeamChatStatus;

  @Prop({
    type: String,
    enum: Object.values(TeamChatDecisionStatus),
    default: TeamChatDecisionStatus.OPEN,
  })
  decisionStatus: TeamChatDecisionStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  deletedBy: MongooseSchema.Types.ObjectId;
}

export const TeamChatSchema = SchemaFactory.createForClass(TeamChat);

TeamChatSchema.index({ campus: 1, isDeleted: 1 });
TeamChatSchema.index({ members: 1, isDeleted: 1 });
TeamChatSchema.index({ status: 1, isDeleted: 1 });
TeamChatSchema.index({ createdAt: -1 });
