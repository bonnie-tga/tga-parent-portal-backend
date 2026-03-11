import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Breakfast, BreakfastStatus, BreakfastVisibility } from '../schemas/breakfast.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { CreateBreakfastDto } from '../dto/create-breakfast.dto';
import { compareObjectIds } from '../../../utils/mongoose-helper';
import { QueryBreakfastDto } from '../dto/query-breakfast.dto';
import { UpdateBreakfastDto } from '../dto/update-breakfast.dto';
import { isAdministrator, buildStrictCampusInFilterByIds } from '../../../common/access/access-filter.util';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';

@Injectable()
export class BreakfastService {
  constructor(
    @InjectModel(Breakfast.name) private breakfastModel: Model<Breakfast>,
  ) {}

  async create(dto: CreateBreakfastDto, currentUser: User): Promise<Breakfast> {
    // Access: non-admin must create within assigned campuses
    if (!isAdministrator(currentUser)) {
      const allowed = Array.isArray(currentUser.campuses) && currentUser.campuses.some((c) => compareObjectIds(c as any, dto.campus as any));
      if (!allowed) {
        throw new ForbiddenException('You do not have permission to create a Breakfast for this campus');
      }
    }

    const doc: any = {
      campus: new Types.ObjectId(dto.campus),
      date: new Date(dto.date),
      status: dto.status || BreakfastStatus.DRAFT,
      visibility: dto.visibility || BreakfastVisibility.PUBLIC,
      createdBy: currentUser._id,
      updatedBy: currentUser._id,
      isDeleted: false,
    };

    if (Array.isArray(dto.childrenEntries)) {
      doc.childrenEntries = dto.childrenEntries.map((e) => ({
        child: e.child ? new Types.ObjectId(e.child) : undefined,
        breakfast: e.breakfast,
      }));
    }

    // Publish handling
    if (String(doc.status) === BreakfastStatus.PUBLISHED && !dto.publishedDate) {
      doc.publishedDate = new Date();
    }
    if (dto.publishedDate) {
      doc.publishedDate = new Date(dto.publishedDate);
    }

    const created = await this.breakfastModel.create(doc);
    return created;
  }

  async findAll(query: QueryBreakfastDto, currentUser: User): Promise<PaginatedResultDto<Breakfast>> {
    const {
      campus,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query as any;

    const skip = (page - 1) * limit;

    const filters: any = { isDeleted: false };

    if (campus) {
      filters.campus = new Types.ObjectId(campus);
    }
    if (status) {
      filters.status = status;
    }


    if (!isAdministrator(currentUser)) {
      const campusFilter = buildStrictCampusInFilterByIds(currentUser.campuses as any, 'campus');
      Object.assign(filters, campusFilter);
    }

    const sortFieldMap: Record<string, string> = {
      publishedAt: 'publishedDate',
      author: 'createdBy',
    };
    const resolvedSortField = sortFieldMap[sortBy] || sortBy;
    const resolvedSortOrder = sortOrder === 'asc' ? 1 : -1;

    const findQuery = this.breakfastModel
      .find(filters)
      .sort({ [resolvedSortField]: resolvedSortOrder })
      .skip(skip)
      .limit(limit)
      .populate('campus', 'name')
      .populate('childrenEntries.child', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();

    const countQuery = this.breakfastModel.countDocuments(filters).exec();

    const [data, total] = await Promise.all([findQuery, countQuery]);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, currentUser: User): Promise<Breakfast> {
    const found = await this.breakfastModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('childrenEntries.child', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!found) {
      throw new NotFoundException('Breakfast record not found');
    }
    if (!isAdministrator(currentUser)) {
      const hasCampusAccess = Array.isArray(currentUser.campuses) && currentUser.campuses.some((c) => compareObjectIds(c as any, (found as any).campus as any));
      if (!hasCampusAccess) {
        throw new ForbiddenException('You do not have access to this Breakfast record');
      }
    }
    return found;
  }

  async update(id: string, dto: UpdateBreakfastDto, currentUser: User): Promise<Breakfast> {
    const existing = await this.breakfastModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!existing) throw new NotFoundException('Breakfast record not found');
    if (!isAdministrator(currentUser)) {
      const hasCampusAccess = Array.isArray(currentUser.campuses) && currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to update this Breakfast record');
      }
    }

    const update: any = { updatedBy: currentUser._id };
    if (dto.date != null) update.date = new Date(dto.date);
    if (dto.campus != null) {
      // Ensure user can move record to another campus
      if (!isAdministrator(currentUser)) {
        const allowed = Array.isArray(currentUser.campuses) && currentUser.campuses.some((c) => compareObjectIds(c as any, dto.campus as any));
        if (!allowed) throw new ForbiddenException('You cannot move Breakfast to a campus you do not have access to');
      }
      update.campus = new Types.ObjectId(dto.campus);
    }
    if (dto.childrenEntries !== undefined) {
      update.childrenEntries = (dto.childrenEntries || []).map((e) => ({
        child: e.child ? new Types.ObjectId(e.child) : undefined,
        breakfast: e.breakfast,
      }));
    }
    if (dto.visibility != null) update.visibility = dto.visibility;
    if (dto.status != null) update.status = dto.status;
    if (dto.publishedDate !== undefined) update.publishedDate = dto.publishedDate ? new Date(dto.publishedDate) : undefined;

    // Publish logic
    if (update.status === BreakfastStatus.PUBLISHED && !update.publishedDate) {
      update.publishedDate = new Date();
    }

    const updated = await this.breakfastModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: update },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Breakfast record not found');
    return updated as any;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const existing = await this.breakfastModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!existing) throw new NotFoundException('Breakfast record not found');
    if (!isAdministrator(currentUser)) {
      const hasCampusAccess = Array.isArray(currentUser.campuses) && currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to delete this Breakfast record');
      }
    }
    const res = await this.breakfastModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, updatedBy: currentUser._id } },
      { new: true },
    );
    if (!res) throw new NotFoundException('Breakfast record not found');
  }

  async findForParent(query: QueryBreakfastDto, currentUser: User): Promise<PaginatedResultDto<Breakfast>> {
    // Only allow parent role users
    if (currentUser.role !== UserRole.PARENT) {
      throw new ForbiddenException('This endpoint is only available for parent users');
    }

    const {
      campus,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query as any;

    const skip = (page - 1) * limit;

    // Get parent's campuses and children
    const parentCampuses = Array.isArray(currentUser.campuses) 
      ? currentUser.campuses.map((c) => new Types.ObjectId(c as any))
      : [];
    const parentChildren = Array.isArray(currentUser.children)
      ? currentUser.children.map((c) => new Types.ObjectId(c as any))
      : [];

    // Build base filter
    const filters: any = {
      isDeleted: false,
      status: BreakfastStatus.PUBLISHED, // Only show published records
      visibility: BreakfastVisibility.PUBLIC, // Only show public records for parents
    };

    // Filter by campus if provided in query
    if (campus) {
      filters.campus = new Types.ObjectId(campus);
    } else if (parentCampuses.length > 0) {
      // Filter by parent's campuses
      filters.campus = { $in: parentCampuses };
    }

    // Filter by status if provided (but still enforce PUBLISHED)
    if (status && status === BreakfastStatus.PUBLISHED) {
      filters.status = status;
    }

    // Build filter for childrenEntries - must contain at least one of parent's children
    if (parentChildren.length > 0) {
      filters['childrenEntries.child'] = { $in: parentChildren };
    } else {
      // If parent has no children, return empty result
      filters._id = { $in: [] };
    }

    const sortFieldMap: Record<string, string> = {
      publishedAt: 'publishedDate',
      author: 'createdBy',
      date: 'date',
    };
    const resolvedSortField = sortFieldMap[sortBy] || sortBy;
    const resolvedSortOrder = sortOrder === 'asc' ? 1 : -1;

    const findQuery = this.breakfastModel
      .find(filters)
      .sort({ [resolvedSortField]: resolvedSortOrder })
      .skip(skip)
      .limit(limit)
      .populate('campus', 'name')
      .populate('childrenEntries.child', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();

    const countQuery = this.breakfastModel.countDocuments(filters).exec();

    const [data, total] = await Promise.all([findQuery, countQuery]);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}