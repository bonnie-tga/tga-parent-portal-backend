import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ImmunisationReminderService } from './immunisation-reminder.service';

@Injectable()
export class ImmunisationReminderSchedulerService {
  private readonly logger = new Logger(ImmunisationReminderSchedulerService.name);

  constructor(
    private readonly immunisationReminderService: ImmunisationReminderService,
  ) {}

  /**
   * Daily at 9:00 AM - Check and create reminders
   * Cron expression: "0 9 * * *" (minute hour day month weekday)
   */
  @Cron('0 9 * * *', {
    name: 'check-immunisation-reminders',
    timeZone: 'Asia/Karachi', // Adjust timezone as needed
  })
  async handleCheckReminders() {
    this.logger.log('Running scheduled job: Check immunisation reminders');
    try {
      await this.immunisationReminderService.checkAndCreateReminders();
      this.logger.log('Scheduled reminder check completed successfully');
    } catch (error) {
      this.logger.error('Error in scheduled reminder check:', error);
    }
  }

}
