import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChangeAttendance,
  ChangeAttendanceSchema,
} from './schemas/change-attendance.schema';
import { ChangeAttendanceController } from './controllers/change-attendance.controller';
import { ChangeAttendanceService } from './services/change-attendance.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ChangeAttendance.name,
        schema: ChangeAttendanceSchema,
      },
    ]),
  ],
  controllers: [ChangeAttendanceController],
  providers: [ChangeAttendanceService],
  exports: [ChangeAttendanceService],
})
export class ChangeAttendanceModule {}


