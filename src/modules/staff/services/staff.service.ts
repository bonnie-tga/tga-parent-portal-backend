import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRole } from '../../users/schemas/user.schema';
import { buildUserAccessFilter, isAdministrator } from '../../../common/access/access-filter.util';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

 

  async findAll(currentUser: User): Promise<User[]> {
    const base = { role: UserRole.STAFF, isDeleted: { $ne: true } } as any;
    const access = isAdministrator(currentUser)
      ? {}
      : buildUserAccessFilter({
          role: currentUser.role,
          accessScope: (currentUser as any).accessScope,
          campuses: currentUser.campuses as any,
          rooms: currentUser.rooms as any,
          children: currentUser.children as any,
        });
    return this.userModel
      .find({ ...base, ...access })
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .populate('children', 'fullName')
      .exec();
  }


  async findByCampus(campusId: string, currentUser: User): Promise<User[]> {
    const base = {
      role: UserRole.STAFF,
      isDeleted: { $ne: true },
      campuses: { $in: [new Types.ObjectId(campusId)] },
    } as any;
    const access = isAdministrator(currentUser)
      ? {}
      : buildUserAccessFilter({
          role: currentUser.role,
          accessScope: (currentUser as any).accessScope,
          campuses: currentUser.campuses as any,
          rooms: currentUser.rooms as any,
          children: currentUser.children as any,
        });
    return this.userModel
      .find({ ...base, ...access })
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .populate('children', 'fullName')
      .exec();
  }

  async findByRoom(roomId: string, currentUser: User): Promise<User[]> {
    const base = {
      role: UserRole.STAFF,
      isDeleted: { $ne: true },
      rooms: { $in: [new Types.ObjectId(roomId)] },
    } as any;
    const access = isAdministrator(currentUser)
      ? {}
      : buildUserAccessFilter({
          role: currentUser.role,
          accessScope: (currentUser as any).accessScope,
          campuses: currentUser.campuses as any,
          rooms: currentUser.rooms as any,
          children: currentUser.children as any,
        });
    return this.userModel
      .find({ ...base, ...access })
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .populate('children', 'fullName')
      .exec();
  }

  async findOne(id: string, currentUser: User): Promise<User> {
    const base = { _id: id, role: UserRole.STAFF, isDeleted: { $ne: true } } as any;
    const access = isAdministrator(currentUser)
      ? {}
      : buildUserAccessFilter({
          role: currentUser.role,
          accessScope: (currentUser as any).accessScope,
          campuses: currentUser.campuses as any,
          rooms: currentUser.rooms as any,
          children: currentUser.children as any,
        });
    const staff = await this.userModel
      .findOne({ ...base, ...access })
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .populate('children', 'fullName')
      .exec();

    if (!staff) {
      throw new NotFoundException(`Staff with ID '${id}' not found`);
    }

    return staff;
  }
}
