import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ImmunisationReminder,
  ImmunisationReminderDocument,
  ImmunisationType,
  ParentResponseStatus,
} from '../schemas/immunisation-reminder.schema';
import { Child } from '../../children/schemas/child.schema';
import { User } from '../../users/schemas/user.schema';
import { CreateImmunisationReminderDto } from '../dto/create-immunisation-reminder.dto';
import { UpdateParentResponseDto } from '../dto/update-parent-response.dto';
import { QueryImmunisationReminderDto } from '../dto/query-immunisation-reminder.dto';
import { FeedService } from '../../feed/feed.service';
import { EmailService } from '../../email/services/email.service';
import { addMonths, addYears, subDays, isSameDay, startOfDay } from 'date-fns';

@Injectable()
export class ImmunisationReminderService {
  private readonly logger = new Logger(ImmunisationReminderService.name);

  constructor(
    @InjectModel(ImmunisationReminder.name)
    private immunisationReminderModel: Model<ImmunisationReminderDocument>,
    @InjectModel(Child.name)
    private childModel: Model<Child>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private feedService: FeedService,
    private emailService: EmailService,
  ) {}

  /**
   * Calculate due dates for all immunisation types based on DOB
   */
  private calculateDueDates(dateOfBirth: Date): {
    type: ImmunisationType;
    dueDate: Date;
    reminderDate: Date;
  }[] {
    const dueDates = [];

    // 4 Months
    const fourMonthsDue = addMonths(dateOfBirth, 4);
    dueDates.push({
      type: ImmunisationType.FOUR_MONTHS,
      dueDate: fourMonthsDue,
      reminderDate: subDays(fourMonthsDue, 7), // 1 week before
    });

    // 6 Months
    const sixMonthsDue = addMonths(dateOfBirth, 6);
    dueDates.push({
      type: ImmunisationType.SIX_MONTHS,
      dueDate: sixMonthsDue,
      reminderDate: subDays(sixMonthsDue, 7),
    });

    // 12 Months
    const twelveMonthsDue = addMonths(dateOfBirth, 12);
    dueDates.push({
      type: ImmunisationType.TWELVE_MONTHS,
      dueDate: twelveMonthsDue,
      reminderDate: subDays(twelveMonthsDue, 7),
    });

    // 4 Years
    const fourYearsDue = addYears(dateOfBirth, 4);
    dueDates.push({
      type: ImmunisationType.FOUR_YEARS,
      dueDate: fourYearsDue,
      reminderDate: subDays(fourYearsDue, 7),
    });

    return dueDates;
  }

  /**
   * Scheduled job: Check all children and create reminders 1 week before due dates
   * This should be called daily via cron job
   */
  async checkAndCreateReminders(): Promise<void> {
    this.logger.log('Starting immunisation reminder check...');

    const today = startOfDay(new Date());
    const children = await this.childModel
      .find({
        isActive: true,
        isArchived: false,
        dateOfBirth: { $exists: true, $ne: null },
      })
      .populate('parents', 'email')
      .populate('campus', 'name')
      .lean()
      .exec();

    let createdCount = 0;

    for (const child of children) {
      if (!child.dateOfBirth) continue;

      const dueDates = this.calculateDueDates(child.dateOfBirth);

      for (const { type, dueDate, reminderDate } of dueDates) {
        // Check if reminder date is today (1 week before due date)
        if (!isSameDay(reminderDate, today)) {
          continue;
        }

        // Check if reminder already exists
        const existingReminder = await this.immunisationReminderModel.findOne({
          childId: child._id,
          remindAbout: type,
          isDeleted: false,
        });

        if (existingReminder) {
          this.logger.debug(
            `Reminder already exists for child ${child._id} - ${type}`,
          );
          continue;
        }

        // Get parent emails
        const parentEmails = (child.parents as any[])
          ?.map((p) => p?.email)
          .filter(Boolean) || [];

        // Create reminder
        const reminder = new this.immunisationReminderModel({
          childId: child._id,
          campusId: child.campus,
          roomId: child.room,
          remindAbout: type,
          reminderDate: startOfDay(reminderDate),
          dueDate: startOfDay(dueDate),
          sentToEmail: parentEmails.join(', '),
        });

        const savedReminder = await reminder.save();

        // Send email to parents immediately when reminder is created
        if (parentEmails.length > 0) {
          try {
            // Get parent details for email
            const childDoc = await this.childModel
              .findById(child._id)
              .populate('parents', 'email firstName lastName')
              .lean()
              .exec();

            const parents = (childDoc?.parents as any[]) || [];

            await Promise.all(
              parents
                .filter((p) => p?.email)
                .map((parent) =>
                  this.emailService.sendImmunisationReminderEmail(
                    parent.email,
                    `${parent.firstName} ${parent.lastName}`.trim() || 'Parent',
                    child.fullName,
                    type,
                  ),
                ),
            );

            // Update reminder with email sent status
            savedReminder.emailSent = true;
            savedReminder.emailSentAt = new Date();
            savedReminder.sentToEmail = parentEmails.join(', ');
            await savedReminder.save();

            this.logger.log(
              `Sent email notification for reminder ${savedReminder._id} to ${parentEmails.length} parent(s)`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to send email for reminder ${savedReminder._id}: ${error.message}`,
            );
            // Continue even if email fails - reminder is already created
          }
        }

        // Create News Feed post
        try {
          // Get campus ID (handle both populated and non-populated cases)
          const campusObj = child.campus as any;
          const campusId = campusObj?._id
            ? campusObj._id.toString()
            : campusObj?.toString() || String(campusObj);

          if (!campusId || !Types.ObjectId.isValid(campusId)) {
            this.logger.warn(
              `Invalid campus ID for child ${child._id}. Skipping feed creation.`,
            );
            continue;
          }

          // Find a system/admin user for creating feed posts
          // Try to find an admin user associated with this campus
          const adminUser = await this.userModel
            .findOne({
              campuses: new Types.ObjectId(campusId),
              role: { $in: ['administrator', 'area_manager', 'director'] },
            })
            .select('_id')
            .lean()
            .exec();

          // If no admin found, use the first user (fallback)
          let systemUserId: string | null = null;
          if (adminUser && adminUser._id) {
            systemUserId = adminUser._id.toString();
          } else {
            const anyUser = await this.userModel.findOne().select('_id').lean().exec();
            if (anyUser && anyUser._id) {
              systemUserId = anyUser._id.toString();
            }
          }

          // If still no valid user found, skip feed creation
          if (!systemUserId || !Types.ObjectId.isValid(systemUserId)) {
            this.logger.warn(
              `No valid user found for creating feed post. Skipping feed creation for reminder ${savedReminder._id}. Reminder created but not posted to feed.`,
            );
            // Continue without creating feed item - reminder is already saved
            continue;
          }

          const feedItem = await this.feedService.create(
            {
              type: 'immunisation-reminder',
              refId: savedReminder._id.toString(),
              title: `Immunisation Reminder - ${child.fullName}`,
              description: `Don't forget your ${type} vaccination. Please be sure to stay up to date with your immunisations to avoid cancellation of your child care subsidy.`,
              isForAllCampuses: false,
              campuses: [campusId],
            },
            systemUserId,
          );

          // Update reminder with feed item ID
          savedReminder.feedItemId = (feedItem as any)._id;
          await savedReminder.save();

          this.logger.log(
            `Created reminder and feed post for child ${child.fullName} - ${type}`,
          );
          createdCount++;
        } catch (error) {
          this.logger.error(
            `Failed to create feed post for reminder ${savedReminder._id}: ${error.message}`,
          );
        }
      }
    }

    this.logger.log(`Immunisation reminder check completed. Created ${createdCount} reminders.`);
  }


  /**
   * Create reminder manually (for testing or admin use)
   */
  async create(
    createDto: CreateImmunisationReminderDto,
  ): Promise<ImmunisationReminder> {
    const child = await this.childModel.findById(createDto.childId).exec();
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // Check if reminder already exists
    const existing = await this.immunisationReminderModel.findOne({
      childId: createDto.childId,
      remindAbout: createDto.remindAbout,
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestException(
        'Reminder already exists for this child and immunisation type',
      );
    }

    const reminder = new this.immunisationReminderModel({
      ...createDto,
      childId: new Types.ObjectId(createDto.childId),
      campusId: new Types.ObjectId(createDto.campusId),
      roomId: new Types.ObjectId(createDto.roomId),
      reminderDate: new Date(createDto.reminderDate),
      dueDate: new Date(createDto.dueDate),
    });

    return reminder.save();
  }

  /**
   * Get all reminders for a child
   */
  async findByChild(
    childId: string,
    user?: User,
  ): Promise<ImmunisationReminder[]> {
    // Verify child exists and user has access
    const child = await this.childModel.findById(childId).exec();
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    return this.immunisationReminderModel
      .find({
        childId: new Types.ObjectId(childId),
        isDeleted: false,
      })
      .populate('childId', 'fullName')
      .populate('campusId', 'name')
      .populate('roomId', 'name')
      .populate('respondedBy', 'firstName lastName')
      .sort({ reminderDate: -1 })
      .exec();
  }

  /**
   * Get all reminders (with optional filters)
   */
  async findAll(
    queryDto: QueryImmunisationReminderDto,
  ): Promise<ImmunisationReminder[]> {
    const filter: any = { isDeleted: false };

    if (queryDto.childId) {
      filter.childId = new Types.ObjectId(queryDto.childId);
    }

    if (queryDto.campusId) {
      filter.campusId = new Types.ObjectId(queryDto.campusId);
    }

    if (queryDto.roomId) {
      filter.roomId = new Types.ObjectId(queryDto.roomId);
    }

    return this.immunisationReminderModel
      .find(filter)
      .populate('childId', 'fullName dateOfBirth')
      .populate('campusId', 'name')
      .populate('roomId', 'name')
      .populate('respondedBy', 'firstName lastName email')
      .sort({ reminderDate: -1 })
      .exec();
  }

  /**
   * Update parent response
   */
  async updateParentResponse(
    updateDto: UpdateParentResponseDto,
    userId: string,
  ): Promise<ImmunisationReminder> {
    const reminder = await this.immunisationReminderModel
      .findById(updateDto.reminderId)
      .populate('childId')
      .exec();

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    const child = reminder.childId as any;
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // Verify user is a parent of this child
    const childDoc = await this.childModel
      .findById(reminder.childId)
      .lean()
      .exec();

    const parentIds = (childDoc?.parents || []).map((p: any) =>
      p.toString(),
    );
    if (!parentIds.includes(userId)) {
      throw new BadRequestException(
        'You are not authorized to respond to this reminder',
      );
    }

    reminder.parentResponse = updateDto.parentResponse;
    reminder.respondedAt = new Date();
    reminder.respondedBy = new Types.ObjectId(userId);

    return reminder.save();
  }

  /**
   * Get single reminder by ID
   */
  async findOne(id: string): Promise<ImmunisationReminder> {
    const reminder = await this.immunisationReminderModel
      .findById(id)
      .populate('childId', 'fullName dateOfBirth')
      .populate('campusId', 'name')
      .populate('roomId', 'name')
      .populate('respondedBy', 'firstName lastName email')
      .exec();

    if (!reminder || reminder.isDeleted) {
      throw new NotFoundException('Reminder not found');
    }

    return reminder;
  }

  /**
   * Delete reminder (for testing or admin use)
   */
  async delete(id: string): Promise<void> {
    const reminder = await this.immunisationReminderModel.findById(id).exec();
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    reminder.isDeleted = true;
    await reminder.save();
  }

  /**
   * Delete reminders by childId and type (for testing)
   */
  async deleteByChildAndType(
    childId: string,
    remindAbout: ImmunisationType,
  ): Promise<void> {
    await this.immunisationReminderModel.updateMany(
      {
        childId: new Types.ObjectId(childId),
        remindAbout,
        isDeleted: false,
      },
      {
        $set: { isDeleted: true },
      },
    );
  }
}
