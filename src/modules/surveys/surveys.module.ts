import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SurveysController } from './controllers/surveys.controller';
import { SurveyResponsesController } from './controllers/survey-responses.controller';
import { SurveysService } from './services/surveys.service';
import { SurveyResponsesService } from './services/survey-responses.service';
import { Survey, SurveySchema } from './schemas/survey.schema';
import { SurveyResponse, SurveyResponseSchema } from './schemas/survey-response.schema';
import { FeedModule } from '../feed/feed.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Survey.name, schema: SurveySchema },
      { name: SurveyResponse.name, schema: SurveyResponseSchema },
    ]),
    forwardRef(() => FeedModule),
    EmailModule,
    NotificationsModule,
  ],
  controllers: [SurveysController, SurveyResponsesController],
  providers: [SurveysService, SurveyResponsesService],
  exports: [SurveysService, SurveyResponsesService],
})
export class SurveysModule {}
