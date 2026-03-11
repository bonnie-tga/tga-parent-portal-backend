import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum SunscreenType {
    SLEEP_REST = 'sleep_rest',
    INDOOR_PLAY = 'indoor_play',
    LEFT_EARLY = 'left_early',
}

export enum SunscreenTimeType {
    ON_ARRIVAL = 'on_arrival',
    AM_20_MIN_BEFORE_TRANSITION = 'am_20_min_before_transition',
    AM_REAPPLICATION = 'am_reapplication',
    PM_20_MIN_BEFORE_TRANSITION = 'pm_20_min_before_transition',
    PM_REAPPLICATION = 'pm_reapplication',
    EXTRA = 'extra',
}

@Schema({ _id: false })
class SunscreenTimeSlot {
    @Prop({ type: String, enum: Object.values(SunscreenTimeType), required: false })
    time?: SunscreenTimeType;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
    staff?: MongooseSchema.Types.ObjectId;

    @Prop({ type: String, enum: Object.values(SunscreenType), default: null })
    value?: SunscreenType | null;

    @Prop({ required: false, default: '' })
    doneTime?: string; // e.g., "7:30 AM"
}

@Schema({ _id: false })
class SunscreenChildEntry {
    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Child' }], required: false })
    children?: MongooseSchema.Types.ObjectId[];

    @Prop({ type: [SunscreenTimeSlot], default: [] })
    slots?: SunscreenTimeSlot[];
}

@Schema({ timestamps: true })
export class Sunscreen extends Document {
    @Prop({ type: Date, required: true })
    date: Date;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
    campus: MongooseSchema.Types.ObjectId;

    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Room' }], required: false, default: [] })
    rooms?: MongooseSchema.Types.ObjectId[];

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    staff: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    author: MongooseSchema.Types.ObjectId;

    @Prop({ type: [SunscreenChildEntry], default: [] })
    sunscreenChildEntries?: SunscreenChildEntry[];

    @Prop({ type: Boolean, default: false })
    isDeleted: boolean;
}

export const SunscreenSchema = SchemaFactory.createForClass(Sunscreen);


