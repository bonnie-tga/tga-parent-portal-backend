import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LittleAboutMe } from '../schemas/little-about-me.schema';
import { LittleAboutMeHistory } from '../schemas/little-about-me-history.schema';
import { Child } from '../../children/schemas/child.schema';
import { CreateLittleAboutMeDto } from '../dto/create-little-about-me.dto';
import { UpdateLittleAboutMeDto } from '../dto/update-little-about-me.dto';
import { QueryLittleAboutMeDto } from '../dto/query-little-about-me.dto';
import { SignLittleAboutMeDto } from '../dto/sign-little-about-me.dto';
import { User, UserRole } from '../../users/schemas/user.schema';
import { NotificationsService } from '../../notifications/services/notifications.service';

@Injectable()
export class LittleAboutMeService {
  constructor(
    @InjectModel(LittleAboutMe.name)
    private readonly littleAboutMeModel: Model<LittleAboutMe>,
    @InjectModel(LittleAboutMeHistory.name)
    private readonly littleAboutMeHistoryModel: Model<LittleAboutMeHistory>,
    @InjectModel(Child.name)
    private readonly childModel: Model<Child>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private isParent(user: User): boolean {
    return user.role === UserRole.PARENT;
  }

  private isStaff(user: User): boolean {
    return [
      UserRole.ADMINISTRATOR,
      UserRole.AREA_MANAGER,
      UserRole.DIRECTOR,
      UserRole.ASSISTANT_DIRECTOR,
      UserRole.EDUCATIONAL_LEADER,
      UserRole.CENTRE_LOGIN,
      UserRole.ROOM_LOGIN,
      UserRole.STAFF,
      UserRole.TEACHER,
    ].includes(user.role as UserRole);
  }

  private async saveToHistory(
    entry: LittleAboutMe,
    updatedBy: Types.ObjectId,
  ): Promise<void> {
    const historyData: any = {
      littleAboutMeId: entry._id,
      child: entry.child,
      campus: entry.campus,
      room: entry.room,
      parent: entry.parent,
      updatedBy,
      date: entry.date,
      name: entry.name,
      preferredName: entry.preferredName,
      specialPeople: entry.specialPeople,
      callMother: entry.callMother,
      callFather: entry.callFather,
      enjoys: entry.enjoys,
      favoriteToy: entry.favoriteToy,
      afraidOf: entry.afraidOf,
      restActivity: entry.restActivity,
      clothingNeeds: entry.clothingNeeds,
      restTimeNappies: entry.restTimeNappies,
      comforters: entry.comforters,
      nappiesAllDay: entry.nappiesAllDay,
      toiletTraining: entry.toiletTraining,
      feedingRequirements: entry.feedingRequirements,
      milkFormula: entry.milkFormula,
      milkDetails: entry.milkDetails,
      milkFormulaEntries: entry.milkFormulaEntries,
      sleepsPerDay: entry.sleepsPerDay,
      sleepDuration: entry.sleepDuration,
      medication: entry.medication,
      developmentalPatterns: entry.developmentalPatterns,
      specialRequests: entry.specialRequests,
      additionalComments: entry.additionalComments,
      routine: entry.routine,
      routineEntries: entry.routineEntries,
      wellnessObservationsUpToDate: entry.wellnessObservationsUpToDate,
      transitionEvaluationEntries: entry.transitionEvaluationEntries,
      signedParent: entry.signedParent,
      signedStaff: entry.signedStaff,
      status: entry.status,
      publishedAt: entry.publishedAt,
    };
    await this.littleAboutMeHistoryModel.create(historyData);
  }

  private async notifyDirector(
    campusId: Types.ObjectId,
    childId: Types.ObjectId,
    parentName: string,
  ): Promise<void> {
    try {
      await this.notificationsService.sendByCampus(
        campusId.toString(),
        'Little About Me Updated',
        `${parentName} has updated Little About Me form`,
        {
          event: 'updated',
          meta: { url: `/admin-education/little-about-me?child=${childId.toString()}` },
          recipientRole: 'staff',
        },
      );
    } catch (error) {
      console.error('Failed to notify director about Little About Me update:', error);
    }
  }

  private buildPayloadFromDto(
    dto: CreateLittleAboutMeDto | UpdateLittleAboutMeDto,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (dto.date !== undefined) {
      const parsedDate = new Date(dto.date);
      if (!Number.isNaN(parsedDate.getTime())) {
        payload.date = parsedDate;
      }
    }
    if (dto.campusId !== undefined) {
      payload.campus = new Types.ObjectId(dto.campusId);
    }
    if (dto.roomId !== undefined) {
      payload.room = new Types.ObjectId(dto.roomId);
    }
    if (dto.childId !== undefined) {
      payload.child = new Types.ObjectId(dto.childId);
    }
    const stringFields = [
      'name',
      'preferredName',
      'specialPeople',
      'callMother',
      'callFather',
      'enjoys',
      'favoriteToy',
      'afraidOf',
      'restActivity',
      'clothingNeeds',
      'restTimeNappies',
      'comforters',
      'nappiesAllDay',
      'toiletTraining',
      'feedingRequirements',
      'milkFormula',
      'milkDetails',
      'sleepsPerDay',
      'sleepDuration',
      'medication',
      'developmentalPatterns',
      'specialRequests',
      'additionalComments',
      'routine',
      'status',
    ];
    stringFields.forEach((field) => {
      if (dto[field as keyof typeof dto] !== undefined) {
        payload[field] = dto[field as keyof typeof dto];
      }
    });
    if (dto.milkFormulaEntries !== undefined) {
      payload.milkFormulaEntries = dto.milkFormulaEntries;
    }
    if (dto.routineEntries !== undefined) {
      payload.routineEntries = dto.routineEntries;
    }
    if (dto.wellnessObservationsUpToDate !== undefined) {
      payload.wellnessObservationsUpToDate = dto.wellnessObservationsUpToDate;
    }
    if (dto.transitionEvaluationEntries !== undefined) {
      payload.transitionEvaluationEntries = dto.transitionEvaluationEntries;
    }
    if (dto.signedParent !== undefined) {
      const parentSignature: any = {};
      if (dto.signedParent.signedBy !== undefined) {
        parentSignature.signedBy = dto.signedParent.signedBy;
      }
      if (dto.signedParent.date !== undefined) {
        const parsedDate = new Date(dto.signedParent.date);
        if (!Number.isNaN(parsedDate.getTime())) {
          parentSignature.date = parsedDate;
        }
      }
      if (dto.signedParent.time !== undefined) {
        parentSignature.time = dto.signedParent.time;
      }
      if (dto.signedParent.signature !== undefined) {
        parentSignature.signature = dto.signedParent.signature;
      }
      payload.signedParent = parentSignature;
    }
    if (dto.signedStaff !== undefined) {
      const staffSignature: any = {};
      if (dto.signedStaff.educator !== undefined) {
        staffSignature.educator = new Types.ObjectId(dto.signedStaff.educator);
      }
      if (dto.signedStaff.signedDate !== undefined) {
        const parsedDate = new Date(dto.signedStaff.signedDate);
        if (!Number.isNaN(parsedDate.getTime())) {
          staffSignature.signedDate = parsedDate;
        }
      }
      if (dto.signedStaff.signedTime !== undefined) {
        staffSignature.signedTime = dto.signedStaff.signedTime;
      }
      if (dto.signedStaff.signature !== undefined) {
        staffSignature.signature = dto.signedStaff.signature;
      }
      payload.signedStaff = staffSignature;
    }
    return payload;
  }

  private populateFields(query: any): any {
    return query
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('parent', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('latestUpdateBy', 'firstName lastName')
      .populate('signedStaff.educator', 'firstName lastName');
  }

  async save(
    dto: CreateLittleAboutMeDto,
    currentUser: User,
  ): Promise<LittleAboutMe> {
    if (!dto.childId) {
      throw new BadRequestException('Child ID is required');
    }
    const childId = new Types.ObjectId(dto.childId);
    const existing = await this.littleAboutMeModel
      .findOne({
        child: childId,
        isDeleted: false,
      })
      .exec();
    if (existing) {
      if (this.isParent(currentUser)) {
        await this.saveToHistory(existing, currentUser._id as Types.ObjectId);
        const campusId = existing.campus as Types.ObjectId;
        const parentName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
        await this.notifyDirector(campusId, childId, parentName);
      }
      const updatePayload: Record<string, unknown> = {
        ...this.buildPayloadFromDto(dto),
        latestUpdateBy: currentUser._id as Types.ObjectId,
      };
      if (this.isParent(currentUser)) {
        delete updatePayload.signedParent;
        delete updatePayload.signedStaff;
        updatePayload.status = 'Draft';
      }
      if (updatePayload.signedStaff && existing.signedStaff) {
        const existingStaff = existing.signedStaff as any;
        const newStaff = updatePayload.signedStaff as any;
        const educatorChanged = newStaff.educator !== undefined && 
          newStaff.educator?.toString() !== existingStaff.educator?.toString();
        updatePayload.signedStaff = {
          educator: newStaff.educator !== undefined ? newStaff.educator : existingStaff.educator,
          signedDate: newStaff.signedDate !== undefined ? newStaff.signedDate : existingStaff.signedDate,
          signedTime: newStaff.signedTime !== undefined ? newStaff.signedTime : existingStaff.signedTime,
          signature: educatorChanged ? undefined : (newStaff.signature !== undefined ? newStaff.signature : existingStaff.signature),
        };
      }
      if (updatePayload.signedParent && existing.signedParent) {
        const existingParent = existing.signedParent as any;
        const newParent = updatePayload.signedParent as any;
        const signedByChanged = newParent.signedBy !== undefined && 
          newParent.signedBy !== existingParent.signedBy;
        updatePayload.signedParent = {
          signedBy: newParent.signedBy !== undefined ? newParent.signedBy : existingParent.signedBy,
          date: newParent.date !== undefined ? newParent.date : existingParent.date,
          time: newParent.time !== undefined ? newParent.time : existingParent.time,
          signature: signedByChanged ? undefined : (newParent.signature !== undefined ? newParent.signature : existingParent.signature),
        };
      }
      if (updatePayload.status === 'Published') {
        updatePayload.publishedAt = new Date();
      }
      const updated = await this.populateFields(
        this.littleAboutMeModel.findOneAndUpdate(
          { _id: existing._id, isDeleted: false },
          updatePayload,
          { new: true },
        ),
      ).exec();
      return updated as LittleAboutMe;
    }
    let parentId: Types.ObjectId;
    if (this.isParent(currentUser)) {
      parentId = currentUser._id as Types.ObjectId;
    } else {
      if (dto.parentId) {
        parentId = new Types.ObjectId(dto.parentId);
      } else {
        const child = await this.childModel.findById(childId).exec();
        if (!child) {
          throw new NotFoundException('Child not found');
        }
        if (!child.parents || child.parents.length === 0) {
          throw new BadRequestException('Child has no parents assigned');
        }
        parentId = new Types.ObjectId(child.parents[0].toString());
      }
    }
    const payload: Record<string, unknown> = this.buildPayloadFromDto(dto);
    if (this.isParent(currentUser)) {
      delete payload.signedParent;
      delete payload.signedStaff;
      payload.status = 'Draft';
    }
    if (payload.status === 'Published') {
      payload.publishedAt = new Date();
    }
    const created = new this.littleAboutMeModel({
      ...payload,
      parent: parentId,
      createdBy: currentUser._id as Types.ObjectId,
      isDeleted: false,
    });
    const saved = await created.save();
    const populated = await this.populateFields(
      this.littleAboutMeModel.findById(saved._id),
    ).exec();
    return populated as LittleAboutMe;
  }

  async findByChild(childId: string): Promise<LittleAboutMe[]> {
    if (!Types.ObjectId.isValid(childId)) {
      throw new BadRequestException('Invalid child ID format');
    }
    return this.populateFields(
      this.littleAboutMeModel
        .find({
          child: new Types.ObjectId(childId),
          isDeleted: false,
        })
        .sort({ createdAt: -1 }),
    ).exec();
  }

  async findLatestByChild(childId: string): Promise<LittleAboutMe | null> {
    if (!Types.ObjectId.isValid(childId)) {
      throw new BadRequestException('Invalid child ID format');
    }
    const item = await this.populateFields(
      this.littleAboutMeModel
        .findOne({
          child: new Types.ObjectId(childId),
          isDeleted: false,
        })
        .sort({ updatedAt: -1 }),
    ).exec();
    return item as LittleAboutMe | null;
  }

  async findHistoryByChild(childId: string): Promise<LittleAboutMeHistory[]> {
    if (!Types.ObjectId.isValid(childId)) {
      throw new BadRequestException('Invalid child ID format');
    }
    return this.littleAboutMeHistoryModel
      .find({
        child: new Types.ObjectId(childId),
      })
      .sort({ createdAt: -1 })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('parent', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('signedStaff.educator', 'firstName lastName')
      .exec();
  }

  async findHistoryByEntryId(entryId: string): Promise<LittleAboutMeHistory[]> {
    if (!Types.ObjectId.isValid(entryId)) {
      throw new BadRequestException('Invalid entry ID format');
    }
    return this.littleAboutMeHistoryModel
      .find({
        littleAboutMeId: new Types.ObjectId(entryId),
      })
      .sort({ createdAt: -1 })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('parent', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('signedStaff.educator', 'firstName lastName')
      .exec();
  }

  async findHistoryById(historyId: string): Promise<LittleAboutMeHistory> {
    if (!Types.ObjectId.isValid(historyId)) {
      throw new BadRequestException('Invalid history ID format');
    }
    const history = await this.littleAboutMeHistoryModel
      .findById(historyId)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('parent', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('signedStaff.educator', 'firstName lastName')
      .exec();
    if (!history) {
      throw new NotFoundException('History entry not found');
    }
    return history;
  }

  async findAll(
    query?: QueryLittleAboutMeDto,
  ): Promise<LittleAboutMe[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: Types.ObjectId;
      room?: Types.ObjectId;
      child?: Types.ObjectId;
      parent?: Types.ObjectId;
      status?: string;
      date?: DateRange;
    };
    const filter: FindAllFilter = { isDeleted: false };
    if (query?.campus) {
      filter.campus = new Types.ObjectId(query.campus);
    }
    if (query?.room) {
      filter.room = new Types.ObjectId(query.room);
    }
    if (query?.child) {
      filter.child = new Types.ObjectId(query.child);
    }
    if (query?.parent) {
      filter.parent = new Types.ObjectId(query.parent);
    }
    if (query?.status) {
      filter.status = query.status;
    }
    if (query?.date) {
      const [yearPart, monthPart] = query.date.split('-');
      const year = Number(yearPart);
      const month = Number(monthPart);
      if (Number.isFinite(year) && Number.isFinite(month)) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        filter.date = { $gte: startDate, $lt: endDate };
      }
    }
    const pageNumber = query?.page ?? 1;
    const pageSize = query?.limit ?? 10;
    const skip = (pageNumber - 1) * pageSize;
    if (query?.search) {
      const searchTerm = query.search.trim();
      if (!searchTerm) {
        return [];
      }
      const searchRegex = new RegExp(searchTerm, 'i');
      const allResults = await this.populateFields(
        this.littleAboutMeModel.find(filter).sort({ createdAt: -1 }),
      ).exec();
      const filtered = allResults.filter((item: any) => {
        const child = item.child as any;
        const childName = child && typeof child.fullName === 'string' ? child.fullName : '';
        const formName = typeof item.name === 'string' ? item.name : '';
        return searchRegex.test(childName) || searchRegex.test(formName);
      });
      return filtered.slice(skip, skip + pageSize);
    }
    return this.populateFields(
      this.littleAboutMeModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
        .limit(pageSize),
    ).exec();
  }

  async findOne(id: string): Promise<LittleAboutMe> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Little About Me ID format');
    }
    const item = await this.populateFields(
      this.littleAboutMeModel.findOne({ _id: id, isDeleted: false }),
    ).exec();
    if (!item) {
      throw new NotFoundException('Little About Me entry not found');
    }
    return item;
  }

  async update(
    id: string,
    dto: UpdateLittleAboutMeDto,
    currentUser: User,
  ): Promise<LittleAboutMe> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Little About Me ID format');
    }
    const existing = await this.littleAboutMeModel
      .findOne({ _id: id, isDeleted: false })
      .exec();
    if (!existing) {
      throw new NotFoundException('Little About Me entry not found');
    }
    if (this.isParent(currentUser)) {
      if (dto.signedParent !== undefined || dto.signedStaff !== undefined) {
        throw new ForbiddenException('Parents cannot update signature fields');
      }
      await this.saveToHistory(existing, currentUser._id as Types.ObjectId);
      const campusId = (existing.campus as Types.ObjectId);
      const childId = (existing.child as Types.ObjectId);
      const parentName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
      await this.notifyDirector(campusId, childId, parentName);
    }
    const updatePayload: Record<string, unknown> = {
      ...this.buildPayloadFromDto(dto),
      latestUpdateBy: currentUser._id as Types.ObjectId,
    };
    if (this.isParent(currentUser)) {
      delete updatePayload.signedParent;
      delete updatePayload.signedStaff;
      updatePayload.status = 'Draft';
    }
    if (updatePayload.signedStaff && existing.signedStaff) {
      const existingStaff = existing.signedStaff as any;
      const newStaff = updatePayload.signedStaff as any;
      updatePayload.signedStaff = {
        educator: newStaff.educator !== undefined ? newStaff.educator : existingStaff.educator,
        signedDate: newStaff.signedDate !== undefined ? newStaff.signedDate : existingStaff.signedDate,
        signedTime: newStaff.signedTime !== undefined ? newStaff.signedTime : existingStaff.signedTime,
        signature: newStaff.signature !== undefined ? newStaff.signature : existingStaff.signature,
      };
    }
    if (updatePayload.signedParent && existing.signedParent) {
      const existingParent = existing.signedParent as any;
      const newParent = updatePayload.signedParent as any;
      updatePayload.signedParent = {
        signedBy: newParent.signedBy !== undefined ? newParent.signedBy : existingParent.signedBy,
        date: newParent.date !== undefined ? newParent.date : existingParent.date,
        time: newParent.time !== undefined ? newParent.time : existingParent.time,
        signature: newParent.signature !== undefined ? newParent.signature : existingParent.signature,
      };
    }
    if (updatePayload.status === 'Published' && !existing.publishedAt) {
      updatePayload.publishedAt = new Date();
    }
    const updated = await this.populateFields(
      this.littleAboutMeModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        updatePayload,
        { new: true },
      ),
    ).exec();
    if (!updated) {
      throw new NotFoundException('Little About Me entry not found');
    }
    return updated as LittleAboutMe;
  }

  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    const pipeline: any[] = [
      { $match: { isDeleted: false, date: { $type: 'date' } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
        },
      },
      { $sort: { year: -1, month: -1 } },
    ];
    const results = await this.littleAboutMeModel.aggregate(pipeline).exec();
    const formatter = new Intl.DateTimeFormat('en-AU', {
      month: 'long',
      year: 'numeric',
    });
    return results.map((item: { year: number; month: number }) => {
      const date = new Date(item.year, item.month - 1, 1);
      return {
        value: `${item.year}-${String(item.month).padStart(2, '0')}`,
        label: formatter.format(date),
      };
    });
  }

  async sign(
    id: string,
    dto: SignLittleAboutMeDto,
    currentUser: User,
  ): Promise<LittleAboutMe> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Little About Me ID format');
    }
    const existing = await this.littleAboutMeModel
      .findOne({ _id: id, isDeleted: false })
      .exec();
    if (!existing) {
      throw new NotFoundException('Little About Me entry not found');
    }
    const updatePayload: Record<string, unknown> = {
      latestUpdateBy: currentUser._id as Types.ObjectId,
    };
    if (dto.signedStaff !== undefined) {
      const staffSignature: any = {};
      if (dto.signedStaff.educator !== undefined) {
        staffSignature.educator = new Types.ObjectId(dto.signedStaff.educator);
      } else {
        staffSignature.educator = undefined;
      }
      if (dto.signedStaff.signedDate !== undefined) {
        const parsedDate = new Date(dto.signedStaff.signedDate);
        if (!Number.isNaN(parsedDate.getTime())) {
          staffSignature.signedDate = parsedDate;
        }
      } else {
        staffSignature.signedDate = undefined;
      }
      if (dto.signedStaff.signedTime !== undefined) {
        staffSignature.signedTime = dto.signedStaff.signedTime;
      } else {
        staffSignature.signedTime = undefined;
      }
      if (dto.signedStaff.signature !== undefined) {
        staffSignature.signature = dto.signedStaff.signature;
      } else {
        staffSignature.signature = undefined;
      }
      if (existing.signedStaff) {
        const existingStaff = existing.signedStaff as any;
        const educatorChanged = dto.signedStaff.educator !== undefined && 
          staffSignature.educator?.toString() !== existingStaff.educator?.toString();
        updatePayload.signedStaff = {
          educator: dto.signedStaff.educator !== undefined ? staffSignature.educator : existingStaff.educator,
          signedDate: dto.signedStaff.signedDate !== undefined ? staffSignature.signedDate : existingStaff.signedDate,
          signedTime: dto.signedStaff.signedTime !== undefined ? staffSignature.signedTime : existingStaff.signedTime,
          signature: educatorChanged ? undefined : (dto.signedStaff.signature !== undefined ? staffSignature.signature : existingStaff.signature),
        };
      } else {
        updatePayload.signedStaff = staffSignature;
      }
    }
    if (dto.signedParent !== undefined) {
      const parentSignature: any = {};
      if (dto.signedParent.signedBy !== undefined) {
        parentSignature.signedBy = dto.signedParent.signedBy;
      } else {
        parentSignature.signedBy = undefined;
      }
      if (dto.signedParent.date !== undefined) {
        const parsedDate = new Date(dto.signedParent.date);
        if (!Number.isNaN(parsedDate.getTime())) {
          parentSignature.date = parsedDate;
        }
      } else {
        parentSignature.date = undefined;
      }
      if (dto.signedParent.time !== undefined) {
        parentSignature.time = dto.signedParent.time;
      } else {
        parentSignature.time = undefined;
      }
      if (dto.signedParent.signature !== undefined) {
        parentSignature.signature = dto.signedParent.signature;
      } else {
        parentSignature.signature = undefined;
      }
      if (existing.signedParent) {
        const existingParent = existing.signedParent as any;
        const signedByChanged = dto.signedParent.signedBy !== undefined && 
          parentSignature.signedBy !== existingParent.signedBy;
        updatePayload.signedParent = {
          signedBy: dto.signedParent.signedBy !== undefined ? parentSignature.signedBy : existingParent.signedBy,
          date: dto.signedParent.date !== undefined ? parentSignature.date : existingParent.date,
          time: dto.signedParent.time !== undefined ? parentSignature.time : existingParent.time,
          signature: signedByChanged ? undefined : (dto.signedParent.signature !== undefined ? parentSignature.signature : existingParent.signature),
        };
      } else {
        updatePayload.signedParent = parentSignature;
      }
    }
    const updated = await this.populateFields(
      this.littleAboutMeModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        updatePayload,
        { new: true },
      ),
    ).exec();
    if (!updated) {
      throw new NotFoundException('Little About Me entry not found');
    }
    return updated as LittleAboutMe;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Little About Me ID format');
    }
    const removed = await this.littleAboutMeModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true },
      )
      .exec();
    if (!removed) {
      throw new NotFoundException('Little About Me entry not found');
    }
  }
}
