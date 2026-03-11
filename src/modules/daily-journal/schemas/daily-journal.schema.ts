import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum DailyJournalStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  PUBLISH = 'Publish',
}

export enum DailyJournalVisibility {
  PUBLIC = 'Public',
  PRIVATE = 'Private',
}

type OutcomeSelection = {
  identity: string[];
  connected: string[];
  wellbeing: string[];
  learners: string[];
  communicators: string[];
  critical: string[];
};

@Schema({ _id: false })
export class EducationTheory {
  @Prop({ type: Boolean, required: false })
  levVygotsky?: boolean;
  @Prop({ type: Boolean, required: false })
  jeanPiaget?: boolean;
  @Prop({ type: Boolean, required: false })
  johnBowlby?: boolean;
  @Prop({ type: Boolean, required: false })
  urieBronfenbrenner?: boolean;
  @Prop({ type: Boolean, required: false })
  howardGardner?: boolean;
  @Prop({ type: Boolean, required: false })
  erikErikson?: boolean;
  @Prop({ type: Boolean, required: false })
  bfSkinner?: boolean;
  @Prop({ type: Boolean, required: false })
  albertBandura?: boolean;
  @Prop({ type: Boolean, required: false })
  friedrichFroebel?: boolean;
  @Prop({ type: Boolean, required: false })
  lorisMalaguzzi?: boolean;
  @Prop({ type: Boolean, required: false })
  rudolfSteiner?: boolean;
  @Prop({ type: Boolean, required: false })
  mariaMontessori?: boolean;
  @Prop({ type: Boolean, required: false })
  johnDewey?: boolean;
}

export const EducationTheorySchema = SchemaFactory.createForClass(EducationTheory);

export enum GroveTheory {
GROVE_BODY = 'Grove Body',
GROVE_HEART = 'Grove Heart',
GROVE_MIND = 'Grove Mind',
GROVE_COMPASS = 'Grove Compass',
GROVE_EXPRESSION = 'Grove Expression'
}

@Schema({ _id: false })
export class IndividualLearning {
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Child' }], required: false })
  children?: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  photos?: string[];

  @Prop({ type: String, required: false })
  learning?: string;
}

export const IndividualLearningSchema = SchemaFactory.createForClass(IndividualLearning);

@Schema({ _id: false })
export class SpontaneousLearning {
  @Prop({ type: Date, required: false })
  date?: Date;

  @Prop({ type: String, required: false })
  title?: string;

  @Prop({ type: String, required: false })
  purpose?: string;

  @Prop({ type: [String], enum: Object.values(GroveTheory), required: false })
  groveTheory? : GroveTheory[];

  @Prop({ type: Boolean, required: false, default: false })
  isAddToCurriculum?: boolean;
}

export const SpontaneousLearningSchema = SchemaFactory.createForClass(SpontaneousLearning);

@Schema({ _id: false })
export class Experience {
  @Prop({ type: Date, required: false })
  date?: Date;

  @Prop({ type: String, required: false })
  question?: string;

  @Prop({ type: String, required: false })
  experience?: string;

  @Prop({ type: [String], enum: Object.values(GroveTheory), required: false })
  groveTheory? : GroveTheory[];
}

export const ExperienceSchema = SchemaFactory.createForClass(Experience);

@Schema({ timestamps: true })
export class DailyJournal extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ type: Date, required: false })
  date?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: false })
  campus?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: false })
  room?: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Child'}], required: false})
  child?: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], required: false })
  teachingTeam?: MongooseSchema.Types.ObjectId[];

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ type: [ExperienceSchema], default: [] })
  experiences?: Experience[];

  @Prop({ type: [IndividualLearningSchema], default: [] })
  individualLearning?: IndividualLearning[];

  @Prop({ type: [SpontaneousLearningSchema], default: [] })
  spontaneousLearning?: SpontaneousLearning[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  completedByName?: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: false })
  educationalLeaderComment?: string;

  @Prop({ type: Boolean, required: false , default: false})
  allowComments?: boolean;

  @Prop({ type: Boolean, required: false , default: false })
  allowTrackbacks?: boolean;

  @Prop({ type: EducationTheorySchema, required: false })
  educationalTheorists?: EducationTheory;

  @Prop({
    type: Object,
    default: {
      identity: [],
      connected: [],
      wellbeing: [],
      learners: [],
      communicators: [],
      critical: [],
    },
  })
  selectedOutcomes: OutcomeSelection;
 

  @Prop({ type: String, enum: Object.values(DailyJournalStatus), default: DailyJournalStatus.DRAFT })
  status: DailyJournalStatus;

  @Prop({ type: String, enum: Object.values(DailyJournalVisibility), default: DailyJournalVisibility.PUBLIC })
  visibility: DailyJournalVisibility;

  @Prop({ type: Date, required: false })
  scheduleAt?: Date;

  @Prop({ type: Date, required: false })
  publishedDate?: Date;

  @Prop({ type: Number, default: 0 })
  commentsCount: number;

  @Prop({ type: Number, default: 0 })
  viewsCount: number;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  viewedByParents?: MongooseSchema.Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  likesCount?: number;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  likedByParents?: MongooseSchema.Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const DailyJournalSchema = SchemaFactory.createForClass(DailyJournal);


