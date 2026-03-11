import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DailyJournal } from '../schemas/daily-journal.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { Child } from '../../children/schemas/child.schema';
import { CreateDailyJournalDto } from '../dto/create-dailyjournal.dto';
import { compareObjectIds, objectIdInArray } from '../../../utils/mongoose-helper';
import { QueryDailyJournalDto } from '../dto/query-dailyjournal.dto';
import { UpdateDailyJournalDto } from '../dto/update-dailyjournal.dto';
import { isAdministrator, buildStrictCampusInFilterByIds } from '../../../common/access/access-filter.util';

@Injectable()
export class DailyJournalService {
  constructor(
    @InjectModel(DailyJournal.name) private dailyJournalModel: Model<DailyJournal>,
    @InjectModel(Child.name) private childModel: Model<Child>,
  ) {}

  private async publishDueScheduled(): Promise<void> {
    const now = new Date();
    const due = await this.dailyJournalModel
      .find({
        isDeleted: false,
        scheduleAt: { $lte: now },
        status: { $nin: ['Publish', 'Pending'] },
      })
      .select('_id scheduleAt publishedDate')
      .lean()
      .exec();

    if (!due || due.length === 0) return;

    const ops = due.map((d: any) => ({
      updateOne: {
        filter: { _id: d._id },
        update: {
          $set: {
            status: 'Publish',
            publishedDate: d.publishedDate ? new Date(d.publishedDate) : new Date(d.scheduleAt),
          },
        },
      },
    }));

    await this.dailyJournalModel.bulkWrite(ops);
  }

  async create(createDailyJournalDto: CreateDailyJournalDto, currentUser: User): Promise<DailyJournal> {
    const {
      campusId,
      roomId,
      child,
      teachingTeam,
      completedByName,
      scheduleAt,
      // Do not allow client to set createdBy/updatedBy/isActive directly here
      createdBy: _ignoreCreatedBy,
      updatedBy: _ignoreUpdatedBy,
      isActive: _ignoreIsActive,
      ...rest
    } = createDailyJournalDto as any;

    const { date, ...restWithoutDate } = rest as any;
    const doc: any = {
      ...restWithoutDate,
      createdBy: currentUser._id,
    };

    if (date) {
      doc.date = new Date(date);
    }
    if (campusId) {
      doc.campus = new Types.ObjectId(campusId);
    }
    if (roomId) {
      doc.room = new Types.ObjectId(roomId);
    }

    if (child && Array.isArray(child) && child.length > 0) {
      const childIds = child.map((id: string) => new Types.ObjectId(id));
      const children = await this.childModel
        .find({ _id: { $in: childIds } })
        .select('_id')
        .lean()
        .exec();
      if (children.length !== childIds.length) {
        throw new NotFoundException(`One or more selected children were not found`);
      }
      doc.child = childIds;
    }
    if (Array.isArray(teachingTeam) && teachingTeam.length > 0) {
      doc.teachingTeam = teachingTeam.map((id: string) => new Types.ObjectId(id));
    }
    if (completedByName) {
      doc.completedByName = new Types.ObjectId(completedByName);
    }
    if (scheduleAt) {
      const scheduled = new Date(scheduleAt);
      doc.scheduleAt = scheduled;
      if (scheduled.getTime() <= Date.now()) {
        // Schedule time already reached → publish now and record publishedDate
        doc.status = 'Publish';
        doc.publishedDate = scheduled;
      } else {
        // Future schedule → keep Draft and DO NOT set publishedDate yet
        doc.status = 'Draft';
      }
    } else if (doc.status && String(doc.status) === 'Publish') {
      doc.publishedDate = new Date();
    }

    const newDailyJournal = new this.dailyJournalModel(doc);
    
    return newDailyJournal.save();
  }

  async findAll(queryParams: QueryDailyJournalDto, currentUser: User): Promise<DailyJournal[]> {
    // Promote scheduled items that are now due
    await this.publishDueScheduled();

    const query: any = { isDeleted: false };

    // Filter by campus if provided
    if (queryParams.campus) {
      query.campus = new Types.ObjectId(queryParams.campus);
    }

    // Filter by room if provided
    if (queryParams.room) {
      query.room = new Types.ObjectId(queryParams.room);
    }

    // Filter by child if provided
    if (queryParams.child) {
      query.child = new Types.ObjectId(queryParams.child);
    }

    // Filter by status if provided
    if (queryParams.status) {
      query.status = queryParams.status;
    }

    // Access control based on current user
    if (!isAdministrator(currentUser)) {
      if (currentUser.rooms && currentUser.rooms.length > 0) {
        // Restrict by rooms if assigned
        if (!query.room) {
          query.room = { $in: currentUser.rooms };
        }
      } else if (currentUser.campuses && currentUser.campuses.length > 0) {
        // Otherwise restrict by campus
        const campusFilter = buildStrictCampusInFilterByIds(currentUser.campuses, 'campus');
        Object.assign(query, campusFilter);
      } else {
        // No access scope
        return [];
      }
    }

    // Build sort object
    const sortBy = queryParams.sortBy || 'date';
    const sortOrder = queryParams.sortOrder || 'desc';
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    return this.dailyJournalModel
      .find(query)
      .sort(sort)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('teachingTeam', 'firstName lastName')
      .populate('completedByName', 'firstName lastName')
      .populate('viewedByParents', 'firstName lastName')
      .populate('likedByParents', 'firstName lastName')
      .populate('individualLearning.children', 'fullName')
      .exec();
  }

  async findOne(id: string, currentUser: User): Promise<DailyJournal> {
    // Promote scheduled item if now due
    await this.publishDueScheduled();

    const dailyJournal = await this.dailyJournalModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('teachingTeam', 'firstName lastName')
      .populate('completedByName', 'firstName lastName')
      .populate('viewedByParents', 'firstName lastName')
      .populate('likedByParents', 'firstName lastName')
      .populate('individualLearning.children', 'fullName')
      .exec();

    if (!dailyJournal) {
      throw new NotFoundException(`Daily Journal with ID '${id}' not found`);
    }

    // Access check for non-admins
    if (!isAdministrator(currentUser)) {
      const roomId = (dailyJournal.room as any)?._id || dailyJournal.room;
      const campusId = (dailyJournal.campus as any)?._id || dailyJournal.campus;
      const hasRoomAccess =
        currentUser.rooms && currentUser.rooms.some((r) => compareObjectIds(r as any, roomId));
      const hasCampusAccess =
        currentUser.campuses && currentUser.campuses.some((c) => compareObjectIds(c as any, campusId));
      
      let hasChildAccess = false;
      if ((currentUser as any).children && Array.isArray((currentUser as any).children) && (currentUser as any).children.length > 0) {
        const userChildIds = (currentUser as any).children.map((c: any) => (c?._id || c).toString());
        const journalChildIds = (Array.isArray(dailyJournal.child) ? dailyJournal.child : []).map((c: any) => (c?._id || c).toString());
        hasChildAccess = userChildIds.some((childId: string) => journalChildIds.includes(childId));
      }
      
      if (!hasRoomAccess && !hasCampusAccess && !hasChildAccess) {
        throw new ForbiddenException('You do not have access to this Daily Journal');
      }
    }

    return dailyJournal;
  }

  async update(id: string, updateDailyJournalDto: UpdateDailyJournalDto, currentUser: User): Promise<DailyJournal> {
    const dailyJournal = await this.dailyJournalModel
      .findOne({ _id: id, isDeleted: false })
      .populate('child', 'room campus')
      .exec();
    
    if (!dailyJournal) {
      throw new NotFoundException(`Daily Journal with ID '${id}' not found`);
    }

    const {
      campusId,
      roomId,
      child,
      teachingTeam,
      completedByName,
      scheduleAt,
      date,
      createdBy: _ignoreCreatedBy,
      ...rest
    } = updateDailyJournalDto as any;

    const updateDoc: any = {
      ...rest,
      updatedBy: currentUser._id,
    };

    if (date) {
      updateDoc.date = new Date(date);
    }
    if (campusId) updateDoc.campus = new Types.ObjectId(campusId);
    if (roomId) updateDoc.room = new Types.ObjectId(roomId);
    if (child && Array.isArray(child)) {
      const childIds = child.map((id: string) => new Types.ObjectId(id));
      const children = await this.childModel
        .find({ _id: { $in: childIds } })
        .select('fullName noConcent')
        .lean()
        .exec();
      if (children.length !== childIds.length) {
        throw new NotFoundException(`One or more selected children were not found`);
      }
      const blocked = children.find((c) => !c.noConcent);
      if (blocked) {
        throw new BadRequestException(`No Consent provided for ${blocked.fullName}`);
      }
      updateDoc.child = childIds;
    }
    if (Array.isArray(teachingTeam)) {
      updateDoc.teachingTeam = teachingTeam.map((id: string) => new Types.ObjectId(id));
    }
    if (completedByName) {
      updateDoc.completedByName = new Types.ObjectId(completedByName);
    }
    if (scheduleAt) {
      const scheduled = new Date(scheduleAt);
      updateDoc.scheduleAt = scheduled;
      if (scheduled.getTime() <= Date.now()) {
        // Schedule time already reached → publish now and record publishedDate
        updateDoc.status = 'Publish';
        updateDoc.publishedDate = scheduled;
      } else {
        // Future schedule → keep Draft and DO NOT set publishedDate yet
        updateDoc.status = 'Draft';
        // leave publishedDate untouched (won't be set if absent)
      }
    }
    if (updateDoc.status && String(updateDoc.status) === 'Publish' && !updateDoc.publishedDate) {
      updateDoc.publishedDate = new Date();
    }

    const updatedDailyJournal = await this.dailyJournalModel
      .findByIdAndUpdate(id, updateDoc, { new: true })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('teachingTeam', 'firstName lastName')
      .populate('completedByName', 'firstName lastName')
      .exec();
      
    return updatedDailyJournal;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const dailyJournal = await this.dailyJournalModel
      .findOne({ _id: id, isDeleted: false })
      .exec();
    
    if (!dailyJournal) {
      throw new NotFoundException(`Daily Journal with ID '${id}' not found`);
    }

    // Access check for non-admins
    if (!isAdministrator(currentUser)) {
      const roomId = (dailyJournal.room as any)?._id || dailyJournal.room;
      const campusId = (dailyJournal.campus as any)?._id || dailyJournal.campus;
      const hasRoomAccess =
        currentUser.rooms && currentUser.rooms.some((r) => compareObjectIds(r as any, roomId));
      const hasCampusAccess =
        currentUser.campuses && currentUser.campuses.some((c) => compareObjectIds(c as any, campusId));
      
      let hasChildAccess = false;
      if ((currentUser as any).children && Array.isArray((currentUser as any).children) && (currentUser as any).children.length > 0) {
        const userChildIds = (currentUser as any).children.map((c: any) => (c?._id || c).toString());
        const journalChildIds = (Array.isArray(dailyJournal.child) ? dailyJournal.child : []).map((c: any) => (c?._id || c).toString());
        hasChildAccess = userChildIds.some((childId: string) => journalChildIds.includes(childId));
      }
      
      if (!hasRoomAccess && !hasCampusAccess && !hasChildAccess) {
        throw new ForbiddenException('You do not have permission to delete this Daily Journal');
      }
    }

    dailyJournal.isDeleted = true;
    (dailyJournal as any).updatedBy = currentUser._id;
    await dailyJournal.save();
  }
}