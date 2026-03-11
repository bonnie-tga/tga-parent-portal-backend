import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WellnessPlan, WellnessPlanSchema } from './schemas/wellness-plan.schema';
import { WellnessPlanController } from './controllers/wellness-plan.controller';
import { WellnessPlanService } from './services/wellness-plan.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WellnessPlan.name, schema: WellnessPlanSchema }]),
  ],
  controllers: [WellnessPlanController],
  providers: [WellnessPlanService],
  exports: [WellnessPlanService],
})
export class WellnessPlanModule {}


