import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LearningExperiance } from '../schemas/learning-experiance.schema';
import { DailyJournal, DailyJournalStatus } from '../../daily-journal/schemas/daily-journal.schema';
import { User } from '../../users/schemas/user.schema';
import { Campus } from '../../campus/schemas/campus.schema';
import { Room } from '../../campus/schemas/room.schema';
import { CreateLearningExperianceDto } from '../dto/create-learning-experiance.dto';
import { GetExperienceFromDailyJournalDto } from '../dto/get-experience-from-daily-journal.dto';
import { UpdateLearningExperienceDto } from '../dto/update-learning-experience.dto';

@Injectable()
export class LearningExperianceService {
  constructor(
    @InjectModel(LearningExperiance.name) private learningExperianceModel: Model<LearningExperiance>,
    @InjectModel(DailyJournal.name) private dailyJournalModel: Model<DailyJournal>,
    @InjectModel(Campus.name) private campusModel: Model<Campus>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
  ) {}

  /**
   * Get Experience data from Daily Journal for Learning Experience
   * Extracts Experience section from published Daily Journals
   * Groups by date and returns Date, Question, Experience, and Grove Categories
   * Works with weekly data based on selected date (Mon-Fri of that week)
   */
  async getExperienceFromDailyJournal(
    queryParams: GetExperienceFromDailyJournalDto,
    currentUser: User,
  ): Promise<any> {
    const { date, campus, room } = queryParams;

    const campusDoc = await this.campusModel.findById(campus).lean().exec();
    if (!campusDoc) {
      throw new NotFoundException(`Campus with ID ${campus} not found`);
    }

    const roomDoc = await this.roomModel.findById(room).lean().exec();
    if (!roomDoc) {
      throw new NotFoundException(`Room with ID ${room} not found`);
    }

    const selectedDate = this.parseDate(date);
    const dayOfWeek = selectedDate.getUTCDay();
    
    // If Saturday (6) or Sunday (0), return empty data
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        weekBeginning: null,
        campus: new Types.ObjectId(campus),
        room: new Types.ObjectId(room),
        days: [],
        message: 'No data available for Saturday or Sunday. Please select a weekday (Monday to Friday).',
      };
    }
    
    const weekDays = this.calculateWeekDays(selectedDate);
    const weekBeginning = weekDays[0];

    const weekDayStrings = new Set<string>();
    weekDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      weekDayStrings.add(dayStr);
    });

    const startDate = weekDays[0];
    const endDate = new Date(weekDays[weekDays.length - 1]);
    endDate.setUTCHours(23, 59, 59, 999);

    const dailyJournals = await this.dailyJournalModel
      .find({
        campus: new Types.ObjectId(campus),
        room: new Types.ObjectId(room),
        $or: [
          // Daily Journal ka main date week range mein hai
          {
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          },
          // Ya Experience section ka koi date week range mein hai
          {
            'experiences.date': {
              $gte: startDate,
              $lte: endDate,
            },
          },
        ],
        status: DailyJournalStatus.PUBLISH,
        isDeleted: false,
      })
      .select('date experiences')
      .sort({ date: 1 })
      .lean()
      .exec();

    const activitiesByDate: { [key: string]: any[] } = {};

    weekDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      activitiesByDate[dayStr] = [];
    });

    dailyJournals.forEach((journal: any) => {
      if (!journal.experiences || !Array.isArray(journal.experiences)) {
        return;
      }

      const journalDate = new Date(journal.date);
      journalDate.setUTCHours(0, 0, 0, 0);
      const journalDateStr = journalDate.toISOString().split('T')[0];
      const journalDayOfWeek = journalDate.getUTCDay();

      // Skip if Daily Journal date is Saturday (6) or Sunday (0)
      if (journalDayOfWeek === 0 || journalDayOfWeek === 6) {
        return;
      }

      const journalDateMatches = weekDayStrings.has(journalDateStr);

      journal.experiences.forEach((exp: any) => {
        let matchingDate: Date | null = null;
        let matchingDateStr: string | null = null;

        if (exp.date) {
          const expDate = new Date(exp.date);
          expDate.setUTCHours(0, 0, 0, 0);
          const expDateStr = expDate.toISOString().split('T')[0];
          const expDayOfWeek = expDate.getUTCDay();
          
          // Skip if Experience date is Saturday (6) or Sunday (0)
          if (expDayOfWeek === 0 || expDayOfWeek === 6) {
            return;
          }
          
          if (weekDayStrings.has(expDateStr)) {
            matchingDate = expDate;
            matchingDateStr = expDateStr;
          }
        }

        if (!matchingDate && journalDateMatches) {
          matchingDate = journalDate;
          matchingDateStr = journalDateStr;
        }

        if (matchingDate && matchingDateStr && activitiesByDate[matchingDateStr]) {
          activitiesByDate[matchingDateStr].push({
            question: exp.question || '',
            experience: exp.experience || '',
            groveCategories: exp.groveTheory || [],
          });
        }
      });
    });

    return {
      weekBeginning: weekBeginning,
      campus: new Types.ObjectId(campus),
      room: new Types.ObjectId(room),
      days: weekDays.map(day => {
        const dayStr = day.toISOString().split('T')[0];
        return {
          date: day,
          activities: activitiesByDate[dayStr] || [],
        };
      }),
    };
  }

  /**
   * Parse date string to Date object at UTC midnight, handling both YYYY-MM-DD and ISO formats
   */
  private parseDate(dateString: string): Date {
    const datePart = dateString.split('T')[0].split('Z')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  /**
   * Calculate week days (Mon-Fri) based on selected date
   * If Monday is selected, returns Mon-Fri
   * If Tuesday is selected, returns Tue-Fri
   * If Friday is selected, returns Fri only
   * Note: Saturday and Sunday are not included (handled separately in calling function)
   */
  private calculateWeekDays(selectedDate: Date | string): Date[] {
    let date: Date;
    if (typeof selectedDate === 'string') {
      date = this.parseDate(selectedDate);
    } else {
      const dateStr = selectedDate.toISOString().split('T')[0];
      date = this.parseDate(dateStr);
    }
    
    // Get day of week in UTC (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = date.getUTCDay();
    
    // Should not be called for Saturday/Sunday (handled in calling function)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return [];
    }
    
    // Calculate Monday of that week
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - daysToMonday);
    monday.setUTCHours(0, 0, 0, 0);
    
    // Calculate all weekdays from Monday to Friday
    const weekDays: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const day = new Date(monday);
      day.setUTCDate(monday.getUTCDate() + i);
      weekDays.push(day);
    }
    
    // Filter: only include days from selected date onwards
    const filteredDays = weekDays.filter(day => {
      const dayStr = day.toISOString().split('T')[0];
      const dateStr = date.toISOString().split('T')[0];
      return dayStr >= dateStr;
    });
    
    return filteredDays;
  }

  /**
   * Find or create Learning Experience entry for a week
   */
  async findOrCreateWeeklyEntry(
    campusId: string,
    roomId: string,
    weekBeginning: Date,
    currentUser: User,
  ): Promise<LearningExperiance> {
    const weekStart = new Date(weekBeginning);
    weekStart.setHours(0, 0, 0, 0);
    
    // Find existing entry for this week
    let entry = await this.learningExperianceModel
      .findOne({
        campus: new Types.ObjectId(campusId),
        room: new Types.ObjectId(roomId),
        weekBeginning: weekStart,
        isDeleted: false,
      })
      .exec();

    // Create if doesn't exist
    if (!entry) {
      entry = new this.learningExperianceModel({
        campus: new Types.ObjectId(campusId),
        room: new Types.ObjectId(roomId),
        weekBeginning: weekStart,
        activities: [],
        createdBy: currentUser._id,
        isDeleted: false,
      });
      await entry.save();
    }

    return entry;
  }

  async create(createLearningExperianceDto: CreateLearningExperianceDto, currentUser: User): Promise<LearningExperiance> {
    const {
      campus,
      room,
      weekBeginning,
      // Do not allow client to set createdBy/updatedBy/isDeleted directly
      createdBy: _ignoreCreatedBy,
      updatedBy: _ignoreUpdatedBy,
      isDeleted: _ignoreIsDeleted,
      ...rest
    } = createLearningExperianceDto as any;

    // Validate campus exists
    const campusDoc = await this.campusModel.findById(campus).lean().exec();
    if (!campusDoc) {
      throw new NotFoundException(`Campus with ID ${campus} not found`);
    }

    // Validate room exists
    const roomDoc = await this.roomModel.findById(room).lean().exec();
    if (!roomDoc) {
      throw new NotFoundException(`Room with ID ${room} not found`);
    }

    const doc: any = {
      ...rest,
      campus: new Types.ObjectId(campus),
      room: new Types.ObjectId(room),
      createdBy: (currentUser._id as any),
      isDeleted: false,
    };

    // Convert weekBeginning if provided
    if (weekBeginning) {
      doc.weekBeginning = new Date(weekBeginning);
    }

    // Mongoose handles nested conversions automatically based on schema definitions
    const newLearningExperiance = new this.learningExperianceModel(doc);
    return await newLearningExperiance.save();
  }

  /**
   * Update activities for a specific week
   * Can add, update, or remove activities for any date in the week
   */
  async updateActivities(
    entryId: string,
    activities: any[],
    currentUser: User,
  ): Promise<LearningExperiance> {
    const entry = await this.learningExperianceModel.findById(entryId).exec();
    if (!entry) {
      throw new NotFoundException(`Learning Experience entry with ID ${entryId} not found`);
    }

    // Update activities
    entry.activities = activities.map((activity: any) => ({
      date: activity.date ? new Date(activity.date) : undefined,
      question: activity.question,
      experience: activity.experience,
      groveCategories: activity.groveCategories || [],
    }));

    (entry as any).updatedBy = currentUser._id;
    await entry.save();

    return entry;
  }

  /**
   * Get Learning Experience entry from table by date, campus, and room
   * Finds entry based on weekBeginning calculated from the selected date
   */
  async getLearningExperience(
    queryParams: GetExperienceFromDailyJournalDto,
    currentUser: User,
  ): Promise<LearningExperiance | any> {
    const { date, campus, room } = queryParams;

    const campusDoc = await this.campusModel.findById(campus).lean().exec();
    if (!campusDoc) {
      throw new NotFoundException(`Campus with ID ${campus} not found`);
    }

    const roomDoc = await this.roomModel.findById(room).lean().exec();
    if (!roomDoc) {
      throw new NotFoundException(`Room with ID ${room} not found`);
    }

    const selectedDate = this.parseDate(date);
    const dayOfWeek = selectedDate.getUTCDay();
    
    // If Saturday (6) or Sunday (0), return empty data
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        message: 'No data available for Saturday or Sunday. Please select a weekday (Monday to Friday).',
        data: null,
      } as any;
    }

    const weekDays = this.calculateWeekDays(selectedDate);
    
    // Calculate Monday of that week (weekBeginning should always be Monday)
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekBeginning = new Date(selectedDate);
    weekBeginning.setUTCDate(selectedDate.getUTCDate() - daysToMonday);
    weekBeginning.setUTCHours(0, 0, 0, 0);

    const weekDayStrings = new Set<string>();
    weekDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      weekDayStrings.add(dayStr);
    });

    const learningExperience = await this.learningExperianceModel
      .findOne({
        campus: new Types.ObjectId(campus),
        room: new Types.ObjectId(room),
        weekBeginning: weekBeginning,
        isDeleted: false,
      })
      .lean()
      .exec();

    const activitiesByDate: { [key: string]: any[] } = {};

    // Initialize activities array for each week day
    weekDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      activitiesByDate[dayStr] = [];
    });

    // Group activities by date (filtering out Saturday/Sunday)
    if (learningExperience && learningExperience.activities && Array.isArray(learningExperience.activities)) {
      learningExperience.activities.forEach((activity: any) => {
        if (activity.date) {
          const activityDate = new Date(activity.date);
          activityDate.setUTCHours(0, 0, 0, 0);
          const activityDateStr = activityDate.toISOString().split('T')[0];
          const activityDayOfWeek = activityDate.getUTCDay();

          // Skip if activity date is Saturday (6) or Sunday (0)
          if (activityDayOfWeek === 0 || activityDayOfWeek === 6) {
            return;
          }

          // Only include activities for week days from selected date onwards
          if (weekDayStrings.has(activityDateStr)) {
            if (activitiesByDate[activityDateStr]) {
              activitiesByDate[activityDateStr].push({
                question: activity.question || '',
                experience: activity.experience || '',
                groveCategories: activity.groveCategories || [],
              });
            }
          }
        }
      });
    }

    return {
      weekBeginning: weekBeginning,
      campus: new Types.ObjectId(campus),
      room: new Types.ObjectId(room),
      days: weekDays.map(day => {
        const dayStr = day.toISOString().split('T')[0];
        return {
          date: day,
          activities: activitiesByDate[dayStr] || [],
        };
      }),
    };
  }

  /**
   * Update Learning Experience entry by date, campus, and room
   * Finds or creates entry based on weekBeginning calculated from the selected date
   */
  async updateLearningExperience(
    updateDto: UpdateLearningExperienceDto,
    currentUser: User,
  ): Promise<LearningExperiance> {
    const { date, campus, room, weekBeginning, activities } = updateDto;

    const campusDoc = await this.campusModel.findById(campus).lean().exec();
    if (!campusDoc) {
      throw new NotFoundException(`Campus with ID ${campus} not found`);
    }

    const roomDoc = await this.roomModel.findById(room).lean().exec();
    if (!roomDoc) {
      throw new NotFoundException(`Room with ID ${room} not found`);
    }

    const selectedDate = this.parseDate(date);
    const dayOfWeek = selectedDate.getUTCDay();
    
    // If Saturday (6) or Sunday (0), throw error
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new NotFoundException('Cannot update data for Saturday or Sunday. Please select a weekday (Monday to Friday).');
    }

    const weekDays = this.calculateWeekDays(selectedDate);
    
    // Calculate Monday of that week (weekBeginning should always be Monday)
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const calculatedWeekBeginning = new Date(selectedDate);
    calculatedWeekBeginning.setUTCDate(selectedDate.getUTCDate() - daysToMonday);
    calculatedWeekBeginning.setUTCHours(0, 0, 0, 0);

    const weekStart = weekBeginning ? this.parseDate(weekBeginning) : calculatedWeekBeginning;
    weekStart.setUTCHours(0, 0, 0, 0);

    let entry = await this.learningExperianceModel
      .findOne({
        campus: new Types.ObjectId(campus),
        room: new Types.ObjectId(room),
        weekBeginning: weekStart,
        isDeleted: false,
      })
      .exec();

    if (!entry) {
      entry = new this.learningExperianceModel({
        campus: new Types.ObjectId(campus),
        room: new Types.ObjectId(room),
        weekBeginning: weekStart,
        activities: [],
        createdBy: currentUser._id,
        isDeleted: false,
      });
    }

    if (activities !== undefined) {
      entry.activities = activities.map((activity: any) => ({
        date: activity.date ? new Date(activity.date) : undefined,
        question: activity.question,
        experience: activity.experience,
        groveCategories: activity.groveCategories || [],
      }));
    }

    if (weekBeginning) {
      entry.weekBeginning = weekStart;
    }

    (entry as any).updatedBy = currentUser._id;
    await entry.save();

    const updatedEntry = await this.learningExperianceModel
      .findById(entry._id)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();

    if (!updatedEntry) {
      throw new NotFoundException(`Learning Experience entry not found after update`);
    }

    return updatedEntry as LearningExperiance;
  }

  /**
   * Export Daily Journal Experience to Learning Experience
   * Note: This is not needed anymore since data is loaded dynamically from Daily Journal
   * Kept for reference or future use if manual activities need to be stored separately
   */
  async exportFromDailyJournal(
    dailyJournal: any,
    currentUser: User,
  ): Promise<void> {
    // Not needed - data is loaded dynamically from Daily Journal
    // This method can be removed or used for other purposes
    return;
  }
}

