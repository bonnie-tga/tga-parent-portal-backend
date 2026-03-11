import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NappyChange, NappyChangeSchema } from './schemas/nappy-change.schema';
import { NappyChangeService } from './services/nappy-change.service';
import { NappyChangeController } from './controllers/nappy-change.controller';
import { WellbeingModule } from '../wellbeing/wellbeing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NappyChange.name, schema: NappyChangeSchema },
    ]),
    WellbeingModule,
  ],
  controllers: [NappyChangeController],
  providers: [NappyChangeService],
  exports: [NappyChangeService],
})
export class NappyChangeModule {}


