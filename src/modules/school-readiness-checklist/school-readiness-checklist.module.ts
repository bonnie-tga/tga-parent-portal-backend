import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchoolReadinessChecklist, SchoolReadinessChecklistSchema } from './schemas/school-readiness-checklist.schema';
import { SchoolReadinessChecklistController } from './controllers/school-readiness-checklist.controller';
import { SchoolReadinessChecklistService } from './services/school-readiness-checklist.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SchoolReadinessChecklist.name, schema: SchoolReadinessChecklistSchema },
    ]),
  ],
  controllers: [SchoolReadinessChecklistController],
  providers: [SchoolReadinessChecklistService],
  exports: [SchoolReadinessChecklistService],
})
export class SchoolReadinessChecklistModule {}


