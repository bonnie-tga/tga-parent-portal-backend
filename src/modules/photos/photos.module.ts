import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Photos, PhotosSchema } from './schemas/photos.schema';
import { PhotosService } from './services/photos.service';
import { PhotosController } from './controllers/photos.controller';
import {
  DailyJournal,
  DailyJournalSchema,
} from '../daily-journal/schemas/daily-journal.schema';
import { Media, MediaSchema } from '../media/media.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Photos.name, schema: PhotosSchema },
      { name: DailyJournal.name, schema: DailyJournalSchema },
      { name: Media.name, schema: MediaSchema },
    ]),
    EmailModule,
  ],
  controllers: [PhotosController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}
