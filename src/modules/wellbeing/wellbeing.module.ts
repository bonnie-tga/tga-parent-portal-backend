import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wellbeing, WellbeingSchema } from './schemas/wellbeing.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { WellbeingService } from './services/wellbeing.service';
import { WellbeingController } from './controllers/wellbeing.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wellbeing.name, schema: WellbeingSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [WellbeingController],
  providers: [WellbeingService],
  exports: [WellbeingService],
})
export class WellbeingModule {}
