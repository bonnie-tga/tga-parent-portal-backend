import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Menu, MenuStatus, MenuRotation, MenuMealItem } from '../schemas/menu.schema';
import { CreateMenuDto } from '../dto/create-menu.dto';
import { UpdateMenuDto } from '../dto/update-menu.dto';
import { QueryMenuDto } from '../dto/query-menu.dto';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';
import { User } from '../../users/schemas/user.schema';
import { buildStrictCampusInFilterByIds, isAdministrator } from '../../../common/access/access-filter.util';

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(Menu.name) private readonly menuModel: Model<Menu>,
  ) { }

  async create(dto: CreateMenuDto, authorId: string, user: User): Promise<Menu> {
    // Access: campus must be within user's campuses unless admin
    if (!isAdministrator(user)) {
      const allowed = (user.campuses || []).map((c) => String(c));
      if (!allowed.includes(String(dto.campus))) {
        throw new ForbiddenException('You do not have access to this campus');
      }
    }

    // Publishing logic
    let publishedAt: Date | null | undefined = undefined;
    let status: MenuStatus | undefined = undefined;
    
    if (dto.status === MenuStatus.PUBLISHED) {
      status = MenuStatus.PUBLISHED;
      publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : new Date();
    } else if (dto.status === MenuStatus.DRAFT) {
      status = MenuStatus.DRAFT;
      publishedAt = null;
    }

    const doc = await this.menuModel.create({
      campus: new Types.ObjectId(dto.campus),
      menuRotation: dto.menuRotation,
      menus: dto.menus,
      ...(status ? { status } : {}),
      ...(publishedAt !== undefined ? { publishedAt } : {}),
      author: new Types.ObjectId(authorId),
    } as any);
    
    // Auto-set rotation start date to createdAt if not explicitly provided (regardless of status)
    const dtoWithRotation = dto as CreateMenuDto & { rotationStartDate?: string };
    if (!dtoWithRotation.rotationStartDate) {
      const docWithDates = doc.toObject() as any;
      const createdAtDate = docWithDates.createdAt || new Date();
      await this.menuModel.findByIdAndUpdate(doc._id, { rotationStartDate: createdAtDate });
      (doc as any).rotationStartDate = createdAtDate;
    } else {
      // If explicitly provided, use it
      await this.menuModel.findByIdAndUpdate(doc._id, { rotationStartDate: new Date(dtoWithRotation.rotationStartDate) });
      (doc as any).rotationStartDate = new Date(dtoWithRotation.rotationStartDate);
    }
    
    return doc;
  }

  async findAll(query: QueryMenuDto, user: User): Promise<PaginatedResultDto<Menu>> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      isDeleted: { $ne: true },
      ...(isAdministrator(user) ? {} : buildStrictCampusInFilterByIds(user?.campuses, 'campus')),
    };

    if (query.campusId) {
      filter.campus = new Types.ObjectId(query.campusId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.menuRotation) {
      filter.menuRotation = query.menuRotation;
    }
    // Basic search placeholder: extend as needed
    if (query.search) {
      // No textual fields to search reliably; keep as noop or add future fields
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = (query.sortOrder || 'desc') === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const [data, total] = await Promise.all([
      this.menuModel.find(filter).populate('author', 'firstName lastName').populate('campus', 'name').sort(sort).skip(skip).limit(limit).lean<Menu[]>(),
      this.menuModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: User): Promise<Menu> {
    const filter: Record<string, any> = {
      _id: new Types.ObjectId(id),
      isDeleted: { $ne: true },
      ...(isAdministrator(user) ? {} : buildStrictCampusInFilterByIds(user?.campuses, 'campus')),
    };
    const doc = await this.menuModel.findOne(filter).populate('author', 'firstName lastName').populate('campus', 'name');
    if (!doc) throw new NotFoundException('Menu not found');
    return doc;
  }

  async update(id: string, dto: UpdateMenuDto, user: User): Promise<Menu> {
    // Ensure the existing document is accessible
    const existing = await this.findOne(id, user);

    // If campus is being changed, verify access to new campus
    if (dto.campus && !isAdministrator(user)) {
      const allowed = (user.campuses || []).map((c) => String(c));
      if (!allowed.includes(String(dto.campus))) {
        throw new ForbiddenException('You do not have access to the target campus');
      }
    }

    const update: any = { ...dto };
    if (dto.campus) update.campus = new Types.ObjectId(dto.campus);

    // Publishing logic on update
    if (dto.status === MenuStatus.PUBLISHED) {
      update.status = MenuStatus.PUBLISHED;
      update.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : new Date();
    } else if (dto.status === MenuStatus.DRAFT) {
      update.status = MenuStatus.DRAFT;
      update.publishedAt = null;
    }

    // Auto-set rotation start date based on createdAt if not already set (regardless of status)
    const existingWithRotation = existing as Menu & { rotationStartDate?: Date | null; createdAt?: Date };
    const dtoWithRotation = dto as UpdateMenuDto & { rotationStartDate?: string };
    
    if (dtoWithRotation.rotationStartDate) {
      // If explicitly provided in update, use it
      update.rotationStartDate = new Date(dtoWithRotation.rotationStartDate);
    } else if (!existingWithRotation.rotationStartDate) {
      // If not set in existing menu and not provided in update, set to createdAt
      update.rotationStartDate = existingWithRotation.createdAt || new Date();
    }

    const updated = await this.menuModel.findByIdAndUpdate(existing._id, update, { new: true }).populate('author', 'firstName lastName').populate('campus', 'name');
    if (!updated) throw new NotFoundException('Menu not found');
    return updated;
  }

  async remove(id: string, user: User): Promise<void> {
    // Soft delete with access check
    const existing = await this.findOne(id, user);
    await this.menuModel.findByIdAndUpdate(existing._id, { isDeleted: true }).populate('author', 'firstName lastName').populate('campus', 'name');
  }

  async getTodayMenu(campusId: string, user: User, targetDate?: Date): Promise<{ menuItems: Array<{ mealTime: string; food: string }>; menuWeek: number; menuOrder: number; day: string }> {
    const filter: Record<string, any> = {
      campus: new Types.ObjectId(campusId),
      status: MenuStatus.PUBLISHED,
      isDeleted: { $ne: true },
      ...(isAdministrator(user) ? {} : buildStrictCampusInFilterByIds(user?.campuses, 'campus')),
    };

    const menu = await this.menuModel.findOne(filter).sort({ publishedAt: -1 }).lean<Menu>();
    if (!menu) {
      throw new NotFoundException('No published menu found for this campus.');
    }

    // Auto-set rotation start date if not set (use createdAt or current date)
    const menuWithRotation = menu as Menu & { rotationStartDate?: Date | null; createdAt?: Date };
    let rotationStartDate = menuWithRotation.rotationStartDate;
    if (!rotationStartDate) {
      rotationStartDate = menuWithRotation.createdAt ? new Date(menuWithRotation.createdAt) : new Date();
      // Update the menu with the auto-set rotation start date
      await this.menuModel.findByIdAndUpdate(menu._id, { rotationStartDate });
    }

    if (!menu.menus || menu.menus.length === 0) {
      throw new BadRequestException('Menu does not have any menu weeks configured.');
    }

    const currentDate = targetDate || new Date();
    const startDate = new Date(rotationStartDate);
    startDate.setHours(0, 0, 0, 0);

    const current = new Date(currentDate);
    current.setHours(0, 0, 0, 0);

    if (current < startDate) {
      const formattedStartDate = startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      throw new BadRequestException(`Menu rotation has not started yet. The rotation starts on ${formattedStartDate}.`);
    }

    const daysDiff = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksSinceStart = Math.floor(daysDiff / 7);
    const rotationWeeks = this.getRotationWeeks(menu.menuRotation);
    const menuOrder = (weeksSinceStart % rotationWeeks) + 1;

    const activeMenuWeek = menu.menus.find((m) => m.order === menuOrder);
    if (!activeMenuWeek) {
      throw new NotFoundException(`Menu week with order ${menuOrder} not found in the rotation.`);
    }

    if (!activeMenuWeek.menuItems || activeMenuWeek.menuItems.length === 0) {
      throw new BadRequestException('The active menu week does not have any menu items configured.');
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayIndex = current.getDay();
    const currentDayName = dayNames[currentDayIndex];

    if (currentDayName === 'Sunday' || currentDayName === 'Saturday') {
      throw new BadRequestException(`Menu is not available on weekends. Please check the menu on weekdays (Monday to Friday).`);
    }

    const todayMenuItems = activeMenuWeek.menuItems.map((item) => {
      const weekDays = item.weekDays as any;
      return {
        mealTime: item.mealTime,
        food: weekDays[currentDayName] || '',
      };
    });

    return {
      menuItems: todayMenuItems,
      menuWeek: weeksSinceStart + 1,
      menuOrder,
      day: currentDayName,
    };
  }

  private getRotationWeeks(menuRotation: MenuRotation): number {
    const mapping: Record<MenuRotation, number> = {
      [MenuRotation.ONE_WEEK_ONLY]: 1,
      [MenuRotation.TWO_WEEKS]: 2,
      [MenuRotation.THREE_WEEKS]: 3,
      [MenuRotation.FOUR_WEEKS]: 4,
      [MenuRotation.FIVE_WEEKS]: 5,
      [MenuRotation.SIX_WEEKS]: 6,
    };
    return mapping[menuRotation] || 1;
  }
}


