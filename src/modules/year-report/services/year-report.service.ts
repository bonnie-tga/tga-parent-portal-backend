import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { YearReport } from '../schemas/year-report.schema';
import { CreateYearReportDto } from '../dto/create-year-report.dto';
import { UpdateYearReportDto } from '../dto/update-year-report.dto';
import { QueryYearReportDto } from '../dto/query-year-report.dto';
import { User } from '../../users/schemas/user.schema';
import { DailyJournal } from '../../daily-journal/schemas/daily-journal.schema';
import { YearReportDailyJournalQueryDto } from '../dto/year-report-dailyjournal-query.dto';
import { isAdministrator, buildStrictCampusInFilterByIds } from '../../../common/access/access-filter.util';

@Injectable()
export class YearReportService {
  constructor(
    @InjectModel(YearReport.name)
    private readonly yearReportModel: Model<YearReport>,
    @InjectModel(DailyJournal.name)
    private readonly dailyJournalModel: Model<DailyJournal>,
  ) {}

  async create(dto: CreateYearReportDto, currentUser: User): Promise<YearReport> {
    const createdPayload: any = {
      ...dto,
      createdBy: currentUser._id,
      updatedBy: currentUser._id,
    };
    if (dto.date) {
      createdPayload.date = new Date(dto.date);
    }
    if (dto.reportPeriodStart) {
      createdPayload.reportPeriodStart = new Date(dto.reportPeriodStart);
    }
    if (dto.reportPeriodEnd) {
      createdPayload.reportPeriodEnd = new Date(dto.reportPeriodEnd);
    }
    if (dto.individualLearning && Array.isArray(dto.individualLearning)) {
      createdPayload.individualLearning = dto.individualLearning.map((item) => ({
        ...item,
        date: item.date ? new Date(item.date) : undefined,
      }));
    }
    const created = new this.yearReportModel(createdPayload);
    return created.save();
  }

  async findAll(query?: QueryYearReportDto): Promise<YearReport[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: string;
      room?: string;
      children?: string | { $in: Types.ObjectId[] };
      preparedBy?: RegExp | string;
      date?: DateRange;
    };
    const filter: FindAllFilter = { isDeleted: false };
    if (query?.campus) {
      filter.campus = query.campus;
    }
    if (query?.room) {
      filter.room = query.room;
    }
    if (query?.children) {
      filter.children = query.children;
    }
    if (query?.preparedBy) {
      filter.preparedBy = new RegExp(query.preparedBy, 'i');
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
    } else if (query?.year) {
      const year = query.year;
      const hasMonth = typeof query.month === 'number';
      const startDate = hasMonth ? new Date(year, query.month - 1, 1) : new Date(year, 0, 1);
      const endDate = hasMonth ? new Date(year, query.month, 1) : new Date(year + 1, 0, 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }
    const pageNumber = query?.page ?? 1;
    const pageSize = query?.limit ?? 10;
    const skip = (pageNumber - 1) * pageSize;
    const mongoFilter: any = { ...filter };
    if (!mongoFilter.date && typeof query?.month === 'number' && !query?.year && !query?.date) {
      mongoFilter.$expr = { $eq: [{ $month: '$date' }, query.month] };
    }
    if (query?.search) {
      const searchTerm = query.search.trim();
      if (!searchTerm) {
        return [];
      }
      const searchRegex = new RegExp(searchTerm, 'i');
      const allResults = await this.yearReportModel
        .find(mongoFilter)
        .sort({ createdAt: -1 })
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('children', 'fullName')
        .exec();
      const filtered = allResults.filter((report) => {
        const child: any = report.children;
        return child && typeof child.fullName === 'string' && searchRegex.test(child.fullName);
      });
      const start = skip;
      const end = start + pageSize;
      return filtered.slice(start, end);
    }
    return this.yearReportModel
      .find(mongoFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .exec();
  }

  async findOne(id: string): Promise<YearReport> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid year report ID format');
    }
    const report = await this.yearReportModel
      .findOne({ _id: id, isDeleted: false })
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .exec();
    if (!report) {
      throw new NotFoundException('Year report not found');
    }
    return report;
  }

    async update(id: string, dto: UpdateYearReportDto, currentUser: User): Promise<YearReport> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid year report ID format');
    }
    const updatePayload: any = { ...dto };
    if (dto.date) {
      updatePayload.date = new Date(dto.date);
    }
    if (dto.reportPeriodStart) {
      updatePayload.reportPeriodStart = new Date(dto.reportPeriodStart);
    }
    if (dto.reportPeriodEnd) {
      updatePayload.reportPeriodEnd = new Date(dto.reportPeriodEnd);
    }
    if (dto.individualLearning && Array.isArray(dto.individualLearning)) {
      updatePayload.individualLearning = dto.individualLearning.map((item) => ({
        ...item,
        date: item.date ? new Date(item.date) : undefined,
      }));
    }
    const updated = await this.yearReportModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { ...updatePayload, updatedBy: currentUser._id },
        { new: true },
      )
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!updated) {
      throw new NotFoundException('Year report not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid year report ID format');
    }
    const removed = await this.yearReportModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true })
      .exec();
    if (!removed) {
      throw new NotFoundException('Year report not found');
    }
  }

  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    const pipeline: any[] = [
      { $match: { isDeleted: false } },
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
    const results = await this.yearReportModel.aggregate(pipeline).exec();
    const formatter = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' });
    return results.map((item: { year: number; month: number }) => {
      const date = new Date(item.year, item.month - 1, 1);
      return {
        value: `${item.year}-${String(item.month).padStart(2, '0')}`,
        label: formatter.format(date),
      };
    });
  }

  async findDailyJournalLearningsByYear(
    query: YearReportDailyJournalQueryDto,
    currentUser: User,
  ): Promise<{
    individualLearning: { date?: Date; photos?: string[]; learning?: string }[];
  }> {
    if (!query.children) {
      throw new BadRequestException('children is required');
    }
    const year = query.year ?? new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    const filter: Record<string, unknown> = {
      isDeleted: false,
      date: { $gte: startDate, $lt: endDate },
    };
    if (query.campus) {
      filter.campus = new Types.ObjectId(query.campus);
    }
    if (query.room) {
      filter.room = new Types.ObjectId(query.room);
    }
    filter.child = new Types.ObjectId(query.children);
    if (!isAdministrator(currentUser)) {
      if (currentUser.rooms && currentUser.rooms.length > 0) {
        if (!filter.room) {
          filter.room = { $in: currentUser.rooms };
        }
      } else if (currentUser.campuses && currentUser.campuses.length > 0) {
        const campusFilter = buildStrictCampusInFilterByIds(currentUser.campuses, 'campus');
        Object.assign(filter, campusFilter);
      } else {
        return { individualLearning: [] };
      }
    }
    const journals = await this.dailyJournalModel
      .find(filter)
      .select('date individualLearning')
      .lean()
      .exec();
    const individualLearning: { date?: Date; photos?: string[]; learning?: string }[] = [];
    journals.forEach((journal: any) => {
      const journalDate: Date | undefined = journal.date;
      if (Array.isArray(journal.individualLearning)) {
        journal.individualLearning.forEach((item: any) => {
          const childrenIds = Array.isArray(item.children)
            ? item.children.map((c: any) => c.toString())
            : [];
          if (!childrenIds.includes(String(query.children))) {
            return;
          }
          individualLearning.push({
            date: journalDate,
            photos: item.photos,
            learning: item.learning,
          });
        });
      }
    });
    return { individualLearning };
  }
}


