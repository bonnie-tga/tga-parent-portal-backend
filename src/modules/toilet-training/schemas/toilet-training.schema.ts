import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum ToiletTrainingCategory {
    TOILET_WET = 'toilet_wet',
    TOILET_DRY = 'toilet_dry',
    TOILET_SOIL = 'toilet_soil',
    DRY_PULL_UP = 'dry_pull_up',
    WET_PULL_UP = 'wet_pull_up',
    SOILED_PULL_UP = 'soiled_pull_up',
    REST_TIME_NAPPY = 'rest_time_nappy',
    ACCIDENT = 'accident',
}

@Schema({ _id: false })
class ToiletTrainingTimeSlot {
    @Prop({ type: [String], enum: Object.values(ToiletTrainingCategory), required: false })
    categories?: ToiletTrainingCategory[];

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
    staff?: MongooseSchema.Types.ObjectId;

    @Prop({ required: false, default: '' })
    doneTime?: string; // e.g., "7:30 AM"
}

@Schema({ _id: false })
class ToiletTrainingChildEntry {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Child', required: false })
    child?: MongooseSchema.Types.ObjectId;

    @Prop({ type: [ToiletTrainingTimeSlot], default: [] })
    slots?: ToiletTrainingTimeSlot[];

    @Prop({ required: false, default: '' })
    comments?: string;
}

@Schema({ timestamps: true })
export class ToiletTraining extends Document {
    @Prop({ type: Date, required: true })
    date: Date;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
    campus: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: false })
    room?: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    author: MongooseSchema.Types.ObjectId;

    @Prop({ type: [ToiletTrainingChildEntry], default: [] })
    toiletTrainingChildEntries?: ToiletTrainingChildEntry[];

    @Prop({ type: Boolean, default: false })
    isDeleted: boolean;
}

export const ToiletTrainingSchema = SchemaFactory.createForClass(ToiletTraining);


