import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ToiletTraining, ToiletTrainingSchema } from './schemas/toilet-training.schema';
import { ToiletTrainingService } from './services/toilet-training.service';
import { ToiletTrainingController } from './controllers/toilet-training.controller';
import { WellbeingModule } from '../wellbeing/wellbeing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ToiletTraining.name, schema: ToiletTrainingSchema },
    ]),
    WellbeingModule,
  ],
  controllers: [ToiletTrainingController],
  providers: [ToiletTrainingService],
  exports: [ToiletTrainingService],
})
export class ToiletTrainingModule {}


