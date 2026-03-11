import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WithdrawalNotice,
  WithdrawalNoticeDecisionStatus,
  WithdrawalNoticeReason,
  WithdrawalNoticeStatus,
} from '../schemas/withdrawal-notice.schema';
import { CreateWithdrawalNoticeDto } from '../dto/create-withdrawal-notice.dto';
import { UpdateWithdrawalNoticeDto } from '../dto/update-withdrawal-notice.dto';
import { QueryWithdrawalNoticeDto } from '../dto/query-withdrawal-notice.dto';
import { User } from '../../users/schemas/user.schema';
import { TransferNoticeService } from '../../transfer-notice/services/transfer-notice.service';

@Injectable()
export class WithdrawalNoticeService {
  constructor(
    @InjectModel(WithdrawalNotice.name)
    private readonly withdrawalNoticeModel: Model<WithdrawalNotice>,
    private readonly transferNoticeService: TransferNoticeService,
  ) {}

  async create(
    dto: CreateWithdrawalNoticeDto,
    currentUser: User,
  ): Promise<WithdrawalNotice> {
    const campusObjectId = new Types.ObjectId(dto.campus);
    const roomObjectId = new Types.ObjectId(dto.room);
    const childrenObjectIds = dto.childrenIds.map(
      (id: string) => new Types.ObjectId(id),
    );
    const dateNoticeGivenValue = new Date(dto.dateNoticeGiven);
    const lastDayOfAttendanceValue = new Date(dto.lastDayOfAttendance);
    if (Number.isNaN(dateNoticeGivenValue.getTime())) {
      throw new BadRequestException('Invalid dateNoticeGiven value');
    }
    if (Number.isNaN(lastDayOfAttendanceValue.getTime())) {
      throw new BadRequestException('Invalid lastDayOfAttendance value');
    }
    const statusValue =
      dto.status ?? WithdrawalNoticeStatus.DRAFT;
    const decisionStatusValue =
      dto.decisionStatus ?? WithdrawalNoticeDecisionStatus.ACCEPTED;
    const newCentreObjectId =
      dto.newCentre !== undefined
        ? new Types.ObjectId(dto.newCentre)
        : undefined;
    const created = new this.withdrawalNoticeModel({
      campus: campusObjectId,
      room: roomObjectId,
      children: childrenObjectIds,
      parentName: dto.parentName,
      contactNumber: dto.contactNumber,
      dateNoticeGiven: dateNoticeGivenValue,
      lastDayOfAttendance: lastDayOfAttendanceValue,
      reason: dto.reason,
      newCentre: newCentreObjectId,
      happyWithService: dto.happyWithService,
      feedback: dto.feedback,
      status: statusValue,
      decisionStatus: decisionStatusValue,
      submittedBy: currentUser._id,
      isDeleted: false,
    });
    const saved = await created.save();
    if (dto.reason === WithdrawalNoticeReason.TRANSFER_BETWEEN_SERVICES) {
      await this.transferNoticeService.createFromWithdrawal(saved);
    }
    return saved;
  }

  async findAll(
    query?: QueryWithdrawalNoticeDto,
  ): Promise<WithdrawalNotice[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: Types.ObjectId;
      room?: Types.ObjectId;
      children?: Types.ObjectId;
      submittedBy?: Types.ObjectId;
      status?: string;
      decisionStatus?: string;
      dateNoticeGiven?: DateRange;
    };
    const isDeletedParam = query?.isDeleted;
    const isDeletedValue = isDeletedParam === 'true';
    const filter: FindAllFilter = { isDeleted: isDeletedValue };
    if (query?.campus) {
      filter.campus = new Types.ObjectId(query.campus);
    }
    if (query?.room) {
      filter.room = new Types.ObjectId(query.room);
    }
    if (query?.child) {
      filter.children = new Types.ObjectId(query.child);
    }
    if (query?.parent) {
      filter.submittedBy = new Types.ObjectId(query.parent);
    }
    if (query?.status) {
      filter.status = query.status;
    }
    if (query?.decisionStatus) {
      filter.decisionStatus = query.decisionStatus;
    }
    if (query?.date) {
      const [yearPart, monthPart] = query.date.split('-');
      const year = Number(yearPart);
      const month = Number(monthPart);
      if (Number.isFinite(year) && Number.isFinite(month)) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        filter.dateNoticeGiven = { $gte: startDate, $lt: endDate };
      }
    }
    const pageNumber = query?.page ?? 1;
    const pageSize = query?.limit ?? 10;
    const skip = (pageNumber - 1) * pageSize;
    const baseQuery = this.withdrawalNoticeModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('submittedBy', 'firstName lastName username');
    const results = await baseQuery.exec();
    if (!query?.search) {
      return results;
    }
    const searchTerm = query.search.trim();
    if (!searchTerm) {
      return [];
    }
    const searchRegex = new RegExp(searchTerm, 'i');
    return results.filter((item: any) => {
      const children = Array.isArray(item.children) ? item.children : [];
      return children.some((child: any) => {
        const childName =
          child && typeof child.fullName === 'string'
            ? child.fullName
            : '';
        return searchRegex.test(childName);
      });
    });
  }

  async findOne(id: string): Promise<WithdrawalNotice> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Withdrawal Notice ID format');
    }
    const item = await this.withdrawalNoticeModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('submittedBy', 'firstName lastName username')
      .exec();
    if (!item) {
      throw new NotFoundException('Withdrawal Notice entry not found');
    }
    return item;
  }

  async update(
    id: string,
    dto: UpdateWithdrawalNoticeDto,
  ): Promise<WithdrawalNotice> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Withdrawal Notice ID format');
    }
    const updatePayload: Record<string, unknown> = {};
    if (dto.campus !== undefined) {
      updatePayload.campus = new Types.ObjectId(dto.campus);
    }
    if (dto.room !== undefined) {
      updatePayload.room = new Types.ObjectId(dto.room);
    }
    if (dto.childrenIds !== undefined) {
      updatePayload.children = dto.childrenIds.map(
        (id: string) => new Types.ObjectId(id),
      );
    }
    if (dto.parentName !== undefined) {
      updatePayload.parentName = dto.parentName;
    }
    if (dto.contactNumber !== undefined) {
      updatePayload.contactNumber = dto.contactNumber;
    }
    if (dto.dateNoticeGiven !== undefined) {
      const parsedNotice = new Date(dto.dateNoticeGiven);
      if (!Number.isNaN(parsedNotice.getTime())) {
        updatePayload.dateNoticeGiven = parsedNotice;
      }
    }
    if (dto.lastDayOfAttendance !== undefined) {
      const parsedLast = new Date(dto.lastDayOfAttendance);
      if (!Number.isNaN(parsedLast.getTime())) {
        updatePayload.lastDayOfAttendance = parsedLast;
      }
    }
    if (dto.reason !== undefined) {
      updatePayload.reason = dto.reason;
    }
    if (dto.happyWithService !== undefined) {
      updatePayload.happyWithService = dto.happyWithService;
    }
    if (dto.feedback !== undefined) {
      updatePayload.feedback = dto.feedback;
    }
    if (dto.status !== undefined) {
      updatePayload.status = dto.status;
    }
    if (dto.decisionStatus !== undefined) {
      updatePayload.decisionStatus = dto.decisionStatus;
    }
    const updated = await this.withdrawalNoticeModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        updatePayload,
        { new: true },
      )
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('submittedBy', 'firstName lastName username')
      .exec();
    if (!updated) {
      throw new NotFoundException('Withdrawal Notice entry not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Withdrawal Notice ID format');
    }
    const removed = await this.withdrawalNoticeModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true },
      )
      .exec();
    if (!removed) {
      throw new NotFoundException('Withdrawal Notice entry not found');
    }
  }

  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    const pipeline: any[] = [
      { $match: { isDeleted: false, dateNoticeGiven: { $type: 'date' } } },
      {
        $group: {
          _id: {
            year: { $year: '$dateNoticeGiven' },
            month: { $month: '$dateNoticeGiven' },
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
    const results = await this.withdrawalNoticeModel.aggregate(pipeline).exec();
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
}




