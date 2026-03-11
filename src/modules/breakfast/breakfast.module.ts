import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Breakfast, BreakfastSchema } from './schemas/breakfast.schema';
import { BreakfastService } from './services/breakfast.service';
import { BreakfastController } from './controllers/breakfast.controller';
import { AutoFeedModule } from '../auto-feed/auto-feed.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Breakfast.name, schema: BreakfastSchema },
    ]),
    AutoFeedModule,
  ],
  controllers: [BreakfastController],
  providers: [BreakfastService],
  exports: [BreakfastService],
})
export class BreakfastModule { }
