import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import configuration from './config/configuration';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CampusModule } from './modules/campus/campus.module';
import { ChildrenModule } from './modules/children/children.module';
import { StaffModule } from './modules/staff/staff.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { PhotosModule } from './modules/photos/photos.module';
import { MessagesModule } from './modules/messages/messages.module';
import { EmailModule } from './modules/email/email.module';
import { PollsModule } from './modules/polls/polls.module';
import { PollResponsesModule } from './modules/poll-responses/poll-responses.module';
import { FeedModule } from './modules/feed/feed.module';
import { MediaModule } from './modules/media/media.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EventModule } from './modules/event/event.module';
import { CommentsModule } from './modules/comments/comments.module';
import { DailyJournalModule } from './modules/daily-journal/dailyjournal.module';
import { NappyChangeModule } from './modules/nappy-change/nappy-change.module';
import { ToiletTrainingModule } from './modules/toilet-training/toilet-training.module';
import { SunscreenModule } from './modules/sunscreen/sunscreen.module';
import { HandoverModule } from './modules/handover/handover.module';
import { MenuModule } from './modules/menu/menu.module'
import { DailyChartModule } from './modules/daily-chart/daily-chart.module';
import { AutoFeedModule } from './modules/auto-feed/auto-feed.module';
import { BreakfastModule } from './modules/breakfast/breakfast.module';
import { SleepTimerModule } from './modules/sleep-timer/sleep-timer.module';
import { CotRoomCheckModule } from './modules/cot-room-check/cot-room-check.module';
import { LearningExperianceModule } from './modules/learning-experiance/learning-experiance.module';
import { GroveCurriculumModule } from './modules/grove-curriculum/grove-curriculum.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { WellbeingModule } from './modules/wellbeing/wellbeing.module';
import { YearReportModule } from './modules/year-report/year-report.module';
import { SchoolReadinessChecklistModule } from './modules/school-readiness-checklist/school-readiness-checklist.module';
import { WellnessPlanModule } from './modules/wellness-plan/wellness-plan.module';
import { LearningJourneyModule } from './modules/learning-journey/learning-journey.module';
import { AbcBehaviourObservationModule } from './modules/abc-behaviour-observation/abc-behaviour-observation.module';
import { StoriesModule } from './modules/stories/stories.module';
import { LittleAboutMeModule } from './modules/little-about-me/little-about-me.module';
import { ChangeAttendanceModule } from './modules/change-attendance/change-attendance.module';
import { ChangeDetailsModule } from './modules/change-details/change-details.module';
import { CasualDayModule } from './modules/casual-day/casual-day.module';
import { UpcomingHolidayModule } from './modules/upcoming-holiday/upcoming-holiday.module';
import { WithdrawalNoticeModule } from './modules/withdrawal-notice/withdrawal-notice.module';
import { TransferNoticeModule } from './modules/transfer-notice/transfer-notice.module';
import { ParentChatModule } from './modules/parent-chat/parent-chat.module';
import { AccountChatModule } from './modules/account-chat/account-chat.module';
import { ManagementChatModule } from './modules/management-chat/management-chat.module';
import { StaffChatModule } from './modules/staff-chat/staff-chat.module';
import { TeamChatModule } from './modules/team-chat/team-chat.module';
import { ChatModule } from './modules/chat/chat.module';
import { ImmunisationReminderModule } from './modules/immunisation-reminder/immunisation-reminder.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{
        ttl: 60,
        limit: 100,
      }],
    }),
    // ServeStaticModule.forRoot({
    //   rootPath: join(__dirname, '..', 'public'),
    //   serveRoot: '/',
    //   exclude: ['/api/:path*'],
    // }),
    MediaModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    CampusModule,
    ChildrenModule,
    StaffModule,
    TeachersModule,
    AnnouncementsModule,
    PhotosModule,
    MessagesModule,
    EmailModule,
    PollsModule,
    PollResponsesModule,
    FeedModule,
    SurveysModule,
    NotificationsModule,
    EventModule,
    CommentsModule,
    DailyJournalModule,
    NappyChangeModule,
    ToiletTrainingModule,
    SunscreenModule,
    HandoverModule,
    MenuModule,
    DailyChartModule,
    AutoFeedModule,
    BreakfastModule,
    SleepTimerModule,
    CotRoomCheckModule,
    LearningExperianceModule,
    GroveCurriculumModule,
    PdfModule,
    WellbeingModule,
    YearReportModule,
    SchoolReadinessChecklistModule,
    WellnessPlanModule,
    LearningJourneyModule,
    AbcBehaviourObservationModule,
    StoriesModule,
    LittleAboutMeModule,
    ChangeAttendanceModule,
    ChangeDetailsModule,
    CasualDayModule,
    UpcomingHolidayModule,
    WithdrawalNoticeModule,
    TransferNoticeModule,
    ParentChatModule,
    AccountChatModule,
    ManagementChatModule,
    StaffChatModule,
    TeamChatModule,
    ChatModule,
    ImmunisationReminderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }