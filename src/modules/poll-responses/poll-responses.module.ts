import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PollResponse,
  PollResponseSchema,
} from './schemas/poll-response.schema';
import { PollResponsesService } from './poll-responses.service';
import { PollResponsesController } from './poll-responses.controller';
import { Poll, PollSchema } from '../polls/schemas/poll.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PollResponse.name, schema: PollResponseSchema },
      { name: Poll.name, schema: PollSchema },
    ]),
  ],
  controllers: [PollResponsesController],
  providers: [PollResponsesService],
  exports: [PollResponsesService],
})
export class PollResponsesModule {}

