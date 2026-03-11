import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChangeDetails,
  ChangeDetailsSchema,
} from './schemas/change-details.schema';
import { ChangeDetailsController } from './controllers/change-details.controller';
import { ChangeDetailsService } from './services/change-details.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ChangeDetails.name,
        schema: ChangeDetailsSchema,
      },
    ]),
  ],
  controllers: [ChangeDetailsController],
  providers: [ChangeDetailsService],
  exports: [ChangeDetailsService],
})
export class ChangeDetailsModule {}


