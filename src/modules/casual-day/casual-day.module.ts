import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CasualDay,
  CasualDaySchema,
} from './schemas/casual-day.schema';
import { CasualDayController } from './controllers/casual-day.controller';
import { CasualDayService } from './services/casual-day.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: CasualDay.name,
        schema: CasualDaySchema,
      },
    ]),
  ],
  controllers: [CasualDayController],
  providers: [CasualDayService],
  exports: [CasualDayService],
})
export class CasualDayModule {}




