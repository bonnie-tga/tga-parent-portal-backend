import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CotRoomCheck, CotRoomCheckSchema } from './schemas/cot-room-check.schema';
import { SleepTimer, SleepTimerSchema } from '../sleep-timer/schemas/sleep-timer.schema';
import { CotRoomCheckService } from './services/cot-room-check.service';
import { CotRoomCheckController } from './controllers/cot-room-check.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CotRoomCheck.name, schema: CotRoomCheckSchema },
      { name: SleepTimer.name, schema: SleepTimerSchema },
    ]),
  ],
  controllers: [CotRoomCheckController],
  providers: [CotRoomCheckService],
  exports: [CotRoomCheckService],
})
export class CotRoomCheckModule {}
