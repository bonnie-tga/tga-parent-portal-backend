import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Handover, HandoverSchema } from './schemas/handover.schema';
import { HandoverService } from './services/handover.service';
import { HandoverController } from './controllers/handover.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Handover.name, schema: HandoverSchema },
    ]),
  ],
  controllers: [HandoverController],
  providers: [HandoverService],
  exports: [HandoverService],
})
export class HandoverModule {}


