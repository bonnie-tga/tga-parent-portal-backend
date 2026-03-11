import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SleepTimer, SleepTimerSchema } from './schemas/sleep-timer.schema';
import { SleepTimerService } from './services/sleep-timer.service';
import { SleepTimerController } from './controllers/sleep-timer.controller';
import { WellbeingModule } from '../wellbeing/wellbeing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SleepTimer.name, schema: SleepTimerSchema },
    ]),
    WellbeingModule,
  ],
  controllers: [SleepTimerController],
  providers: [SleepTimerService],
  exports: [SleepTimerService],
})
export class SleepTimerModule {}
