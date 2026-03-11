import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UpcomingHoliday,
  UpcomingHolidaySchema,
} from './schemas/upcoming-holiday.schema';
import { UpcomingHolidayController } from './controllers/upcoming-holiday.controller';
import { UpcomingHolidayService } from './services/upcoming-holiday.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: UpcomingHoliday.name,
        schema: UpcomingHolidaySchema,
      },
    ]),
  ],
  controllers: [UpcomingHolidayController],
  providers: [UpcomingHolidayService],
  exports: [UpcomingHolidayService],
})
export class UpcomingHolidayModule {}




