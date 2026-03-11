import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AbcBehaviourObservation,
  AbcBehaviourObservationSchema,
} from './schemas/abc-behaviour-observation.schema';
import { AbcBehaviourObservationController } from './controllers/abc-behaviour-observation.controller';
import { AbcBehaviourObservationService } from './services/abc-behaviour-observation.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AbcBehaviourObservation.name,
        schema: AbcBehaviourObservationSchema,
      },
    ]),
  ],
  controllers: [AbcBehaviourObservationController],
  providers: [AbcBehaviourObservationService],
  exports: [AbcBehaviourObservationService],
})
export class AbcBehaviourObservationModule {}



