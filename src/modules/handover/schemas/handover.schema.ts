import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum HandoverStatus {
    DRAFT = 'Draft',
    PUBLISHED = 'Published',
}

@Schema({ timestamps: true })
export class Handover extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
    campus: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: false })
    room?: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Child', required: true })
    child: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
    author?: MongooseSchema.Types.ObjectId;

    @Prop({ type: [String], default: [] })
    photos?: string[];

    @Prop({ type: String, required: false })
    wakeUpTime?: string;

    @Prop({ type: String, required: false })
    breakfastTime?: string;

    @Prop({ type: String, required: false })
    whatWasEaten?: string;

    @Prop({ type: String, required: false })
    lastTimeOfBottleFeed?: string;

    @Prop({ type: String, required: false })
    lastTimeOfBottleDetail?: string;

    @Prop({ type: String, required: false })
    lastNappyChangeTime?: string;

    @Prop({ type: String, required: false })
    lastNappyChangeDetail?: string;

    @Prop({ type: String, required: false })
    specialInstructionsForTheDay?: string;

    @Prop({ type: String, required: false })
    emotionalNeed?: string;

    @Prop({ type: String, required: false })
    behaviour?: string;

    @Prop({ type: String, required: false })
    restTime?: string;

    @Prop({ type: String, required: false })
    anyChangeInRoutine?: string;

    @Prop({ type: String, required: false })
    additionalComments?: string;

    @Prop({ type: Date, default: null })
    publishedAt?: Date | null;

    @Prop({ type: String, enum: Object.values(HandoverStatus), default: HandoverStatus.DRAFT })
    status?: HandoverStatus;

    @Prop({ type: Boolean, default: false })
    isDeleted?: boolean;
}

export const HandoverSchema = SchemaFactory.createForClass(Handover);


