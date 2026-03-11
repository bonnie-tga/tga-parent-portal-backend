import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyChart, DailyChartSchema } from './schemas/daily-chart.schema';
import { DailyChartService } from './services/daily-chart.service';
import { DailyChartController } from './controllers/daily-chart.controller';
import { Child, ChildSchema } from '../children/schemas/child.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Campus, CampusSchema } from '../campus/schemas/campus.schema';
import { Room, RoomSchema } from '../campus/schemas/room.schema';
import { AutoFeedModule } from '../auto-feed/auto-feed.module';
import { WellbeingModule } from '../wellbeing/wellbeing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyChart.name, schema: DailyChartSchema },
      { name: Child.name, schema: ChildSchema },
      { name: User.name, schema: UserSchema },
      { name: Campus.name, schema: CampusSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
    AutoFeedModule,
    WellbeingModule,
  ],
  controllers: [DailyChartController],
  providers: [DailyChartService],
  exports: [DailyChartService],
})
export class DailyChartModule { }
