import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ImmunisationReminder,
  ImmunisationReminderSchema,
} from './schemas/immunisation-reminder.schema';
import { ImmunisationReminderService } from './services/immunisation-reminder.service';
import { ImmunisationReminderSchedulerService } from './services/immunisation-reminder-scheduler.service';
import { ImmunisationReminderController } from './controllers/immunisation-reminder.controller';
import { Child, ChildSchema } from '../children/schemas/child.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { FeedModule } from '../feed/feed.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImmunisationReminder.name, schema: ImmunisationReminderSchema },
      { name: Child.name, schema: ChildSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => FeedModule),
    EmailModule,
  ],
  controllers: [ImmunisationReminderController],
  providers: [ImmunisationReminderService, ImmunisationReminderSchedulerService],
  exports: [ImmunisationReminderService, MongooseModule],
})
export class ImmunisationReminderModule {}
