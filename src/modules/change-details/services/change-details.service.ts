import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChangeDetails,
  EmergencyContact,
} from '../schemas/change-details.schema';
import { CreateChangeDetailsDto } from '../dto/create-change-details.dto';
import { UpdateChangeDetailsDto } from '../dto/update-change-details.dto';
import { QueryChangeDetailsDto } from '../dto/query-change-details.dto';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class ChangeDetailsService {
  constructor(
    @InjectModel(ChangeDetails.name)
    private readonly changeDetailsModel: Model<ChangeDetails>,
  ) {}

  async create(
    dto: CreateChangeDetailsDto,
    currentUser: User,
  ): Promise<ChangeDetails> {
    const campusObjectId = new Types.ObjectId(dto.campusId);
    const roomObjectId =
      dto.roomId !== undefined ? new Types.ObjectId(dto.roomId) : undefined;
    const emergencyContact: EmergencyContact | undefined =
      dto.emergencyContact
        ? {
            name: dto.emergencyContact.name,
            relationship: dto.emergencyContact.relationship,
            phoneNumber: dto.emergencyContact.phoneNumber,
            address: dto.emergencyContact.address,
            emergencyType: dto.emergencyContact.emergencyType,
            emergencyAction: dto.emergencyContact.emergencyAction,
            children: dto.emergencyContact.children?.map(
              (id: string) => new Types.ObjectId(id),
            ),
          }
        : undefined;
    const additionalEmergencyContact: EmergencyContact | undefined =
      dto.additionalEmergencyContact
        ? {
            name: dto.additionalEmergencyContact.name,
            relationship: dto.additionalEmergencyContact.relationship,
            phoneNumber: dto.additionalEmergencyContact.phoneNumber,
            address: dto.additionalEmergencyContact.address,
            emergencyType: dto.additionalEmergencyContact.emergencyType,
            emergencyAction: dto.additionalEmergencyContact.emergencyAction,
            children: dto.additionalEmergencyContact.children?.map(
              (id: string) => new Types.ObjectId(id),
            ),
          }
        : undefined;
    const created = new this.changeDetailsModel({
      campus: campusObjectId,
      room: roomObjectId,
      newAddress: dto.newAddress,
      newPhoneNumber: dto.newPhoneNumber,
      addOrRemoveEmergencyContact: dto.addOrRemoveEmergencyContact,
      emergencyContact,
      additionalEmergencyContact,
      submittedBy: currentUser._id,
      isDeleted: false,
    });
    return created.save();
  }

  async findAll(
    query?: QueryChangeDetailsDto,
  ): Promise<ChangeDetails[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: Types.ObjectId;
      room?: Types.ObjectId;
      submittedBy?: Types.ObjectId;
      status?: string;
      decisionStatus?: string;
      'emergencyContact.children'?: Types.ObjectId;
      createdAt?: DateRange;
    };
    const filter: FindAllFilter = { isDeleted: false };
    if (query?.campus) {
      filter.campus = new Types.ObjectId(query.campus);
    }
    if (query?.room) {
      filter.room = new Types.ObjectId(query.room);
    }
    if (query?.child) {
      filter['emergencyContact.children'] = new Types.ObjectId(query.child);
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
    const baseQuery = this.changeDetailsModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('emergencyContact.children', 'fullName')
      .populate('additionalEmergencyContact.children', 'fullName')
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
      const submittedBy = item.submittedBy as any;
      const firstName =
        submittedBy && typeof submittedBy.firstName === 'string'
          ? submittedBy.firstName
          : '';
      const lastName =
        submittedBy && typeof submittedBy.lastName === 'string'
          ? submittedBy.lastName
          : '';
      const username =
        submittedBy && typeof submittedBy.username === 'string'
          ? submittedBy.username
          : '';
      const fullName = `${firstName} ${lastName}`.trim();
      return (
        searchRegex.test(fullName) ||
        searchRegex.test(firstName) ||
        searchRegex.test(lastName) ||
        searchRegex.test(username)
      );
    });
  }

  async findOne(id: string): Promise<ChangeDetails> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Change Details ID format');
    }
    const item = await this.changeDetailsModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('emergencyContact.children', 'fullName')
      .populate('additionalEmergencyContact.children', 'fullName')
      .populate('submittedBy', 'firstName lastName username')
      .exec();
    if (!item) {
      throw new NotFoundException('Change Details entry not found');
    }
    return item;
  }

  async update(
    id: string,
    dto: UpdateChangeDetailsDto,
  ): Promise<ChangeDetails> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Change Details ID format');
    }
    const updatePayload: Record<string, unknown> = {};
    const emergencyContactUpdates: Partial<EmergencyContact> = {};
    const additionalEmergencyContactUpdates: Partial<EmergencyContact> = {};
    if (dto.campusId !== undefined) {
      updatePayload.campus = new Types.ObjectId(dto.campusId);
    }
    if (dto.roomId !== undefined) {
      updatePayload.room = new Types.ObjectId(dto.roomId);
    }
    if (dto.newAddress !== undefined) {
      updatePayload.newAddress = dto.newAddress;
    }
    if (dto.newPhoneNumber !== undefined) {
      updatePayload.newPhoneNumber = dto.newPhoneNumber;
    }
    if (dto.addOrRemoveEmergencyContact !== undefined) {
      updatePayload.addOrRemoveEmergencyContact =
        dto.addOrRemoveEmergencyContact;
    }
    if (dto.emergencyContact !== undefined) {
      if (dto.emergencyContact.name !== undefined) {
        emergencyContactUpdates.name = dto.emergencyContact.name;
      }
      if (dto.emergencyContact.relationship !== undefined) {
        emergencyContactUpdates.relationship =
          dto.emergencyContact.relationship;
      }
      if (dto.emergencyContact.phoneNumber !== undefined) {
        emergencyContactUpdates.phoneNumber =
          dto.emergencyContact.phoneNumber;
      }
      if (dto.emergencyContact.address !== undefined) {
        emergencyContactUpdates.address = dto.emergencyContact.address;
      }
      if (dto.emergencyContact.emergencyType !== undefined) {
        emergencyContactUpdates.emergencyType =
          dto.emergencyContact.emergencyType;
      }
      if (dto.emergencyContact.emergencyAction !== undefined) {
        emergencyContactUpdates.emergencyAction =
          dto.emergencyContact.emergencyAction;
      }
      if (dto.emergencyContact.children !== undefined) {
        emergencyContactUpdates.children = dto.emergencyContact.children.map(
          (id: string) => new Types.ObjectId(id),
        );
      }
    }
    if (dto.additionalEmergencyContact !== undefined) {
      if (dto.additionalEmergencyContact.name !== undefined) {
        additionalEmergencyContactUpdates.name =
          dto.additionalEmergencyContact.name;
      }
      if (dto.additionalEmergencyContact.relationship !== undefined) {
        additionalEmergencyContactUpdates.relationship =
          dto.additionalEmergencyContact.relationship;
      }
      if (dto.additionalEmergencyContact.phoneNumber !== undefined) {
        additionalEmergencyContactUpdates.phoneNumber =
          dto.additionalEmergencyContact.phoneNumber;
      }
      if (dto.additionalEmergencyContact.address !== undefined) {
        additionalEmergencyContactUpdates.address =
          dto.additionalEmergencyContact.address;
      }
      if (dto.additionalEmergencyContact.emergencyType !== undefined) {
        additionalEmergencyContactUpdates.emergencyType =
          dto.additionalEmergencyContact.emergencyType;
      }
      if (dto.additionalEmergencyContact.emergencyAction !== undefined) {
        additionalEmergencyContactUpdates.emergencyAction =
          dto.additionalEmergencyContact.emergencyAction;
      }
      if (dto.additionalEmergencyContact.children !== undefined) {
        additionalEmergencyContactUpdates.children =
          dto.additionalEmergencyContact.children.map(
            (id: string) => new Types.ObjectId(id),
          );
      }
    }
    if (Object.keys(emergencyContactUpdates).length > 0) {
      updatePayload.emergencyContact = emergencyContactUpdates;
    }
    if (Object.keys(additionalEmergencyContactUpdates).length > 0) {
      updatePayload.additionalEmergencyContact =
        additionalEmergencyContactUpdates;
    }
    if (dto.status !== undefined) {
      updatePayload.status = dto.status;
    }
    if (dto.decisionStatus !== undefined) {
      updatePayload.decisionStatus = dto.decisionStatus;
    }
    const updated = await this.changeDetailsModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        updatePayload,
        { new: true },
      )
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('emergencyContact.children', 'fullName')
      .populate('submittedBy', 'firstName lastName username')
      .exec();
    if (!updated) {
      throw new NotFoundException('Change Details entry not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Change Details ID format');
    }
    const removed = await this.changeDetailsModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true },
      )
      .exec();
    if (!removed) {
      throw new NotFoundException('Change Details entry not found');
    }
  }

  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    const pipeline: any[] = [
      { $match: { isDeleted: false } },
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
    const results = await this.changeDetailsModel.aggregate(pipeline).exec();
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


