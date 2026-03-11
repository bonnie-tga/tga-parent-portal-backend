import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GroveCurriculum, Months, Years } from '../schemas/grove-curriculum.schema';
import { DailyJournal, DailyJournalStatus, GroveTheory } from '../../daily-journal/schemas/daily-journal.schema';
import { User } from '../../users/schemas/user.schema';
import { Campus } from '../../campus/schemas/campus.schema';
import { Room } from '../../campus/schemas/room.schema';
import { CreateGroveCurriculumDto } from '../dto/create-grove-curriculum.dto';
import { GetSpontaneousLearningDto } from '../dto/get-spontaneous-learning.dto';
import { UpdateGroveCurriculumDto } from '../dto/update-grove-curriculum.dto';
import { GetGroveCurriculumDto } from '../dto/get-grove-curriculum.dto';

@Injectable()
export class GroveCurriculumService {
  constructor(
    @InjectModel(GroveCurriculum.name) private groveCurriculumModel: Model<GroveCurriculum>,
    @InjectModel(DailyJournal.name) private dailyJournalModel: Model<DailyJournal>,
    @InjectModel(Campus.name) private campusModel: Model<Campus>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
  ) {}

  /**
   * Calculate start and end date for a month/year
   */
  private getMonthDateRange(month: Months, year: Years): { startDate: Date; endDate: Date } {
    const monthIndex = Object.values(Months).indexOf(month);
    const startDate = new Date(parseInt(year), monthIndex, 1);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(parseInt(year), monthIndex + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return { startDate, endDate };
  }

  /**
   * Get Spontaneous Learning data from Daily Journal for Grove Curriculum
   * Only extracts data where "Add to Curriculum" is checked and status is Publish
   * Groups by Grove Theory (Grove Body, Grove Mind, etc.)
   * Returns only Date and Title
   */
  async getSpontaneousLearningFromDailyJournal(
    queryParams: GetSpontaneousLearningDto,
    currentUser: User,
  ): Promise<any> {
    const { month, year, campus, room } = queryParams;

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

    // Calculate month date range for filtering spontaneous learning entries
    const { startDate, endDate } = this.getMonthDateRange(month, year);

    // Query all published Daily Journals for this campus and room
    // Don't filter by journal date - filter by spontaneous learning date instead
    const dailyJournals = await this.dailyJournalModel
      .find({
        campus: new Types.ObjectId(campus),
        room: new Types.ObjectId(room),
        status: DailyJournalStatus.PUBLISH,
        isDeleted: false,
      })
      .select('spontaneousLearning date')
      .sort({ date: 1 })
      .lean()
      .exec();

    // Group Spontaneous Learning by Grove Theory
    const result: any = {
      groveBody: [],
      groveMind: [],
      groveHeart: [],
      groveCompass: [],
      groveExpression: [],
    };

    // Map Grove Theory enum to result keys
    const groveTheoryMap: { [key: string]: string } = {
      [GroveTheory.GROVE_BODY]: 'groveBody',
      [GroveTheory.GROVE_MIND]: 'groveMind',
      [GroveTheory.GROVE_HEART]: 'groveHeart',
      [GroveTheory.GROVE_COMPASS]: 'groveCompass',
      [GroveTheory.GROVE_EXPRESSION]: 'groveExpression',
    };

    // Extract Spontaneous Learning where isAddToCurriculum is true
    dailyJournals.forEach((journal: any) => {
      if (journal.spontaneousLearning && Array.isArray(journal.spontaneousLearning)) {
        journal.spontaneousLearning.forEach((spontaneous: any) => {
          // Only export if "Add to Curriculum" is checked
          if (spontaneous.isAddToCurriculum === true) {
            // Use spontaneous date if available, otherwise journal date
            let itemDate: Date;
            if (spontaneous.date) {
              itemDate = new Date(spontaneous.date);
            } else if (journal.date) {
              itemDate = new Date(journal.date);
            } else {
              return; // Skip if no date available
            }

            // Normalize date to start of day for comparison
            const normalizedDate = new Date(itemDate);
            normalizedDate.setHours(0, 0, 0, 0);

            // Filter by the requested month/year - check if item date falls within range
            if (normalizedDate < startDate || normalizedDate > endDate) {
              return; // Skip if date is outside the requested month/year
            }

            const title = (spontaneous.title || '').trim();
            if (!title) {
              return; // Skip if no title
            }

            const spontaneousLearningItem = {
              date: normalizedDate,
              title: title,
            };

            // Group by Grove Theory
            if (spontaneous.groveTheory && Array.isArray(spontaneous.groveTheory)) {
              spontaneous.groveTheory.forEach((groveTheory: string) => {
                const key = groveTheoryMap[groveTheory];
                if (key && result[key]) {
                  result[key].push(spontaneousLearningItem);
                }
              });
            }
          }
        });
      }
    });

    return result;
  }

  async create(createGroveCurriculumDto: CreateGroveCurriculumDto, currentUser: User): Promise<GroveCurriculum> {
    const {
      campus,
      room,
      // Do not allow client to set createdBy/updatedBy/isDeleted directly
      createdBy: _ignoreCreatedBy,
      updatedBy: _ignoreUpdatedBy,
      isDeleted: _ignoreIsDeleted,
      ...rest
    } = createGroveCurriculumDto as any;

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

    // Mongoose handles nested conversions automatically based on schema definitions
    const newGroveCurriculum = new this.groveCurriculumModel(doc);
    return await newGroveCurriculum.save();
  }

  async findOne(queryParams: GetGroveCurriculumDto): Promise<GroveCurriculum | null> {
    const { month, year, campus, room } = queryParams;

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

    const groveCurriculum = await this.groveCurriculumModel
      .findOne({
        month,
        year,
        campus: new Types.ObjectId(campus),
        room: new Types.ObjectId(room),
        isDeleted: false,
      })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('groveBody.outdoorLearning.children', 'fullName')
      .populate('groveMind.outdoorLearning.children', 'fullName')
      .populate('groveHeart.outdoorLearning.children', 'fullName')
      .populate('groveCompass.outdoorLearning.children', 'fullName')
      .populate('groveExpression.outdoorLearning.children', 'fullName')
      .populate('familyFeedBack.parent', 'firstName lastName')
      .exec();

    // Return user-friendly message if not found
    if (!groveCurriculum) {
      return {
        message: `No grove curriculum data found for month: ${month}, year: ${year}`,
        data: null,
      } as any;
    }

    return groveCurriculum;
  }

  async findById(id: string): Promise<GroveCurriculum> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid grove curriculum ID format');
    }

    const groveCurriculum = await this.groveCurriculumModel
      .findOne({
        _id: new Types.ObjectId(id),
        isDeleted: false,
      })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('groveBody.outdoorLearning.children', 'fullName')
      .populate('groveMind.outdoorLearning.children', 'fullName')
      .populate('groveHeart.outdoorLearning.children', 'fullName')
      .populate('groveCompass.outdoorLearning.children', 'fullName')
      .populate('groveExpression.outdoorLearning.children', 'fullName')
      .populate('familyFeedBack.parent', 'firstName lastName')
      .exec();

    if (!groveCurriculum) {
      throw new NotFoundException(`Grove curriculum with ID ${id} not found`);
    }

    return groveCurriculum;
  }

  async update(
    id: string,
    updateGroveCurriculumDto: UpdateGroveCurriculumDto,
    currentUser: User,
  ): Promise<GroveCurriculum> {
    const {
      campus,
      room,
      // Do not allow client to set createdBy/updatedBy/isDeleted directly
      createdBy: _ignoreCreatedBy,
      updatedBy: _ignoreUpdatedBy,
      isDeleted: _ignoreIsDeleted,
      ...rest
    } = updateGroveCurriculumDto as any;

    // Find the existing document
    const existingGroveCurriculum = await this.groveCurriculumModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!existingGroveCurriculum) {
      throw new NotFoundException(`Grove curriculum with ID ${id} not found`);
    }

    // Validate campus exists if provided
    if (campus) {
      const campusDoc = await this.campusModel.findById(campus).lean().exec();
      if (!campusDoc) {
        throw new NotFoundException(`Campus with ID ${campus} not found`);
      }
    }

    // Validate room exists if provided
    if (room) {
      const roomDoc = await this.roomModel.findById(room).lean().exec();
      if (!roomDoc) {
        throw new NotFoundException(`Room with ID ${room} not found`);
      }
    }

    // Build update object
    const updateDoc: any = {
      ...rest,
      updatedBy: currentUser._id as any,
    };

    if (campus) {
      updateDoc.campus = new Types.ObjectId(campus);
    }

    if (room) {
      updateDoc.room = new Types.ObjectId(room);
    }

    // Update the document
    const updatedGroveCurriculum = await this.groveCurriculumModel
      .findByIdAndUpdate(id, updateDoc, { new: true, runValidators: true })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();

    if (!updatedGroveCurriculum) {
      throw new NotFoundException(`Grove curriculum with ID ${id} not found`);
    }

    return updatedGroveCurriculum;
  }
}

