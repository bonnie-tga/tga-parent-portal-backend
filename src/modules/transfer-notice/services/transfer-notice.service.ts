import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TransferNotice } from '../schemas/transfer-notice.schema';
import { CreateTransferNoticeDto } from '../dto/create-transfer-notice.dto';
import { UpdateTransferNoticeDto } from '../dto/update-transfer-notice.dto';
import { QueryTransferNoticeDto } from '../dto/query-transfer-notice.dto';
import { User } from '../../users/schemas/user.schema';
import { WithdrawalNotice } from '../../withdrawal-notice/schemas/withdrawal-notice.schema';

@Injectable()
export class TransferNoticeService {
  constructor(
    @InjectModel(TransferNotice.name)
    private readonly transferNoticeModel: Model<TransferNotice>,
  ) {}

  async create(
    dto: CreateTransferNoticeDto,
    currentUser: User,
  ): Promise<TransferNotice> {
    const oldCampusObjectId = new Types.ObjectId(dto.oldCampusId);
    const newCampusObjectId = new Types.ObjectId(dto.newCampusId);
    const childrenObjectIds = dto.childrenIds.map(
      (id: string) => new Types.ObjectId(id),
    );
    const created = new this.transferNoticeModel({
      oldCampus: oldCampusObjectId,
      newCampus: newCampusObjectId,
      children: childrenObjectIds,
      linkToWithdrawalNotice: dto.linkToWithdrawalNotice,
      status: dto.status,
      decisionStatus: dto.decisionStatus,
      submittedBy: currentUser._id,
      isDeleted: false,
    });
    return created.save();
  }

  async createFromWithdrawal(
    withdrawal: WithdrawalNotice,
  ): Promise<TransferNotice> {
    const oldCampusId = withdrawal.campus;
    const newCampusId = withdrawal.newCentre;
    const childrenIds = withdrawal.children || [];
    const created = new this.transferNoticeModel({
      oldCampus: oldCampusId,
      newCampus: newCampusId,
      children: childrenIds,
      linkToWithdrawalNotice: String(withdrawal._id),
      submittedBy: withdrawal.submittedBy,
      isDeleted: false,
    });
    return created.save();
  }

  async findAll(
    query?: QueryTransferNoticeDto,
  ): Promise<TransferNotice[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      oldCampus?: Types.ObjectId;
      newCampus?: Types.ObjectId;
      children?: Types.ObjectId;
      submittedBy?: Types.ObjectId;
      status?: string;
      decisionStatus?: string;
      createdAt?: DateRange;
    };
    const isDeletedParam = query?.isDeleted;
    const isDeletedValue = isDeletedParam === 'true';
    const filter: FindAllFilter = { isDeleted: isDeletedValue };
    if (query?.oldCampus) {
      filter.oldCampus = new Types.ObjectId(query.oldCampus);
    }
    if (query?.newCampus) {
      filter.newCampus = new Types.ObjectId(query.newCampus);
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
        filter.createdAt = { $gte: startDate, $lt: endDate };
      }
    }
    const pageNumber = query?.page ?? 1;
    const pageSize = query?.limit ?? 10;
    const skip = (pageNumber - 1) * pageSize;
    const baseQuery = this.transferNoticeModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('oldCampus', 'name')
      .populate('newCampus', 'name')
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

  async findOne(id: string): Promise<TransferNotice> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Transfer Notice ID format');
    }
    const item = await this.transferNoticeModel
      .findOne({ _id: id, isDeleted: false })
      .populate('oldCampus', 'name')
      .populate('newCampus', 'name')
      .populate('children', 'fullName')
      .populate('submittedBy', 'firstName lastName username')
      .exec();
    if (!item) {
      throw new NotFoundException('Transfer Notice entry not found');
    }
    return item;
  }

  async update(
    id: string,
    dto: UpdateTransferNoticeDto,
  ): Promise<TransferNotice> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Transfer Notice ID format');
    }
    const updatePayload: Record<string, unknown> = {};
    if (dto.oldCampusId !== undefined) {
      updatePayload.oldCampus = new Types.ObjectId(dto.oldCampusId);
    }
    if (dto.newCampusId !== undefined) {
      updatePayload.newCampus = new Types.ObjectId(dto.newCampusId);
    }
    if (dto.childrenIds !== undefined) {
      updatePayload.children = dto.childrenIds.map(
        (id: string) => new Types.ObjectId(id),
      );
    }
    if (dto.linkToWithdrawalNotice !== undefined) {
      updatePayload.linkToWithdrawalNotice = dto.linkToWithdrawalNotice;
    }
    if (dto.status !== undefined) {
      updatePayload.status = dto.status;
    }
    if (dto.decisionStatus !== undefined) {
      updatePayload.decisionStatus = dto.decisionStatus;
    }
    const updated = await this.transferNoticeModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        updatePayload,
        { new: true },
      )
      .populate('oldCampus', 'name')
      .populate('newCampus', 'name')
      .populate('children', 'fullName')
      .populate('submittedBy', 'firstName lastName username')
      .exec();
    if (!updated) {
      throw new NotFoundException('Transfer Notice entry not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Transfer Notice ID format');
    }
    const removed = await this.transferNoticeModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true },
      )
      .exec();
    if (!removed) {
      throw new NotFoundException('Transfer Notice entry not found');
    }
  }

  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    const pipeline: any[] = [
      { $match: { isDeleted: false, createdAt: { $type: 'date' } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
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
    const results = await this.transferNoticeModel.aggregate(pipeline).exec();
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

