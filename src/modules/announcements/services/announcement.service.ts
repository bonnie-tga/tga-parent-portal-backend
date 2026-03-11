import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Announcement, AnnouncementScope, AnnouncementType, AnnouncementStatus } from '../schemas/announcement.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/update-announcement.dto';
import { QueryAnnouncementsDto } from '../dto/query-announcements.dto';
import { SaveDraftDto } from '../dto/save-draft.dto';
import { BulkActionDto, BulkAction } from '../dto/bulk-operations.dto';
import { PaginatedAnnouncementsDto } from '../dto/paginated-announcements.dto';
import { compareObjectIds, objectIdInArray } from '../../../utils/mongoose-helper';
import { MediaService } from 'src/modules/media/media.service';
import { buildAnnouncementAccessFilter } from 'src/common/access/access-filter.util';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { GoogleStorageService, UploadResult } from 'src/google-drive/google-storage.service';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectModel(Announcement.name) private announcementModel: Model<Announcement>,
    private mediaService: MediaService,
    private gcsStorageService: GoogleStorageService,
    private readonly notificationsService: NotificationsService,
  ) {}

    private validateFiles(files: Express.Multer.File[]): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedDocumentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    for (const file of files) {
      if (file.size > maxSize) {
        throw new BadRequestException(`File ${file.originalname} exceeds maximum size of 10MB`);
      }

      const isImage = file.mimetype.startsWith('image/');
      const isDocument = allowedDocumentTypes.includes(file.mimetype);

      if (!isImage && !isDocument) {
        throw new BadRequestException(`File type ${file.mimetype} is not allowed. Only images and documents are permitted.`);
      }
    }
  }



  async create(createAnnouncementDto: CreateAnnouncementDto, currentUser: User): Promise<Announcement> {
    const newAnnouncement = new this.announcementModel({
      ...createAnnouncementDto,
      createdBy: currentUser._id,
      // Set publish date to current time if not provided and status is published
      publishDate: createAnnouncementDto.publishDate || (createAnnouncementDto.status === AnnouncementStatus.PUBLISHED ? new Date() : undefined),
    });
    
    const savedAnnouncement = await newAnnouncement.save();

    // If published, send notifications to parents in targeted campuses
    if (savedAnnouncement.status === AnnouncementStatus.PUBLISHED) {
      try {
        const isForAllCampuses = createAnnouncementDto.scope === AnnouncementScope.ALL;
        const campuses = isForAllCampuses ? [] : (createAnnouncementDto.campuses || []);

        const campusIds = isForAllCampuses
          ? []
          : campuses.map((c) => (typeof c === 'string' ? c : String(c)));
        if (campusIds.length === 0) {
          // For ALL campuses we skip campus-based notifications (no campusId to filter by)
        } else {
          for (const campusId of campusIds) {
            try {
              await this.notificationsService.sendByCampus(
                campusId,
                'New Announcement',
                savedAnnouncement.shortDescription || savedAnnouncement.title,
                {
                  refModel: 'Announcement',
                  relatedEntityId: (savedAnnouncement as any)._id.toString(),
                  event: 'created',
                  meta: { url: `/announcements/${(savedAnnouncement as any)._id.toString()}` },
                  recipientRole: 'parent',
                },
              );
            } catch (notificationError) {
              console.error(`Failed to send announcement notifications for campus ${campusId}:`, notificationError);
            }
          }
        }
      } catch (error) {
        console.error('Failed to send announcement notifications:', error);
      }
    }

    return savedAnnouncement;
  }

  
   private validateScopeFields(createAnnouncementDto: CreateAnnouncementDto): void {
    if (createAnnouncementDto.scope === 'campus' && (!createAnnouncementDto.campuses || createAnnouncementDto.campuses.length === 0)) {
      throw new BadRequestException('At least one Campus ID is required when scope is campus');
    }

    if (createAnnouncementDto.scope === 'room' && (!createAnnouncementDto.rooms || createAnnouncementDto.rooms.length === 0)) {
      throw new BadRequestException('At least one room ID is required when scope is room');
    }
  }


  async saveDraft(saveDraftDto: SaveDraftDto, currentUser: User): Promise<Announcement> {
    const draftData = {
      ...saveDraftDto,
      status: AnnouncementStatus.DRAFT,
      createdBy: currentUser._id,
    };
    
    const newDraft = new this.announcementModel(draftData);
    const savedDraft = await newDraft.save();
    
    return savedDraft;
  }

  async publish(id: string, currentUser: User): Promise<Announcement> {
    const announcement = await this.announcementModel.findById(id).exec();
    
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID '${id}' not found`);
    }

    // Check if user has permission to publish this announcement
    if (
      currentUser.role !== UserRole.ADMINISTRATOR &&
      currentUser.role !== UserRole.AREA_MANAGER &&
      !compareObjectIds(announcement.createdBy, currentUser._id)
    ) {
      throw new ForbiddenException('You do not have permission to publish this announcement');
    }

    announcement.status = AnnouncementStatus.PUBLISHED;
    announcement.publishDate = new Date();
    
    const savedAnnouncement = await announcement.save();

    // Send notifications to parents in targeted campuses
    try {
      const isForAllCampuses = savedAnnouncement.scope === AnnouncementScope.ALL;
      const campuses = isForAllCampuses ? [] : (savedAnnouncement.campuses?.map((c: any) => {
        return typeof c === 'object' && c !== null && '_id' in c ? c._id.toString() : c.toString();
      }) || []);

      const campusIds = isForAllCampuses
        ? []
        : campuses.map((c: any) => (typeof c === 'string' ? c : String(c)));
      if (campusIds.length === 0) {
        // For ALL campuses we skip campus-based notifications
      } else {
        for (const campusId of campusIds) {
          try {
            await this.notificationsService.sendByCampus(
              campusId,
              'New Announcement',
              savedAnnouncement.shortDescription || savedAnnouncement.title,
              {
                refModel: 'Announcement',
                relatedEntityId: (savedAnnouncement as any)._id.toString(),
                event: 'created',
                meta: { url: `/announcements/${(savedAnnouncement as any)._id.toString()}` },
                recipientRole: 'parent',
              },
            );
          } catch (notificationError) {
            console.error(`Failed to send announcement notifications for campus ${campusId}:`, notificationError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to send announcement notifications:', error);
    }

    return savedAnnouncement;
  }

  async getPublishedByCampuses(campusIds: string[], currentUser: User): Promise<any[]> {
    const query: any = {
      status: AnnouncementStatus.PUBLISHED,
      isDeleted: false,
      isActive: true,
    };

    // const now = new Date();

    // // Date range filter: only show announcements that are currently active
    // query.$and = [
    //   {
    //     $or: [
    //       { startDate: { $lte: now } },
    //       { startDate: { $exists: false } },
    //       { startDate: null },
    //     ],
    //   },
    //   {
    //     $or: [
    //       { endDate: { $gte: now } },
    //       { endDate: { $exists: false } },
    //       { endDate: null },
    //     ],
    //   },
    // ];

    // If campusIds are provided, filter by them
    if (campusIds && campusIds.length > 0) {
      const objectIdCampuses = campusIds.map(id => new Types.ObjectId(id));
      query.$and.push({
        $or: [
          { scope: AnnouncementScope.ALL },
          { scope: AnnouncementScope.ROOM, campuses: { $in: objectIdCampuses } },
          { scope: AnnouncementScope.CAMPUS, campuses: { $in: objectIdCampuses } },
        ],
      });
    } else {
      // If no campus IDs provided, return announcements with scope "all" only
      query.scope = AnnouncementScope.ALL;
    }

    const announcements = await this.announcementModel
      .find(query)
      .sort({ isPinned: -1, publishDate: -1 })
      .populate('createdBy', 'firstName lastName')
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .lean()
      .exec();

    return announcements;
  }

  async findAll(queryParams: QueryAnnouncementsDto, currentUser: User): Promise<PaginatedAnnouncementsDto> {
    const query: any = {};

    // Filter by type if provided
    if (queryParams.type) {
      query.type = queryParams.type;
    }

    // Filter by scope if provided
    if (queryParams.scope) {
      query.scope = queryParams.scope;
    }

    // Filter by status if provided
    if (queryParams.status) {
      if (queryParams.status === AnnouncementStatus.TRASHED) {
        query.isDeleted = true;
      } else {
        query.status = queryParams.status;
        query.isDeleted = false;
      }
    } else {
      // By default, exclude trashed items unless specifically requested
      query.isDeleted = false;
    }

    // Search functionality
    if (queryParams.search) {
      query.$or = [
        { title: { $regex: queryParams.search, $options: 'i' } },
        { content: { $regex: queryParams.search, $options: 'i' } },
        { shortDescription: { $regex: queryParams.search, $options: 'i' } }
      ];
    }

    // Filter by active status
    if (queryParams.isActive !== undefined) {
      query.isActive = queryParams.isActive;
    }

    // Filter by campus
    if (queryParams.campus) {
      query.campuses = new Types.ObjectId(queryParams.campus);
    }

    // Filter by rooms
    if (queryParams.rooms && queryParams.rooms.length > 0) {
      query.rooms = { $in: queryParams.rooms.map(roomId => new Types.ObjectId(roomId)) };
    }

    // Filter by date range if provided
    if (queryParams.startDate || queryParams.endDate) {
      query.publishDate = {};
      if (queryParams.startDate) {
        query.publishDate.$gte = new Date(queryParams.startDate);
      }
      if (queryParams.endDate) {
        query.publishDate.$lte = new Date(queryParams.endDate);
      }
    }

    // Apply access control: only Admin sees all
    if (currentUser.role !== UserRole.ADMINISTRATOR) {
      if (queryParams.status === AnnouncementStatus.TRASHED) {
        query.createdBy = currentUser._id;
      } else {
        // Strict: no global for non-admin, only campus/room intersection OR own drafts
        const access = buildAnnouncementAccessFilter(currentUser, { includeGlobal: false });
        const accessOrOwn: any = {
          $or: [
            { status: AnnouncementStatus.DRAFT, createdBy: currentUser._id },
            { status: AnnouncementStatus.PUBLISHED, ...(access || {}) },
          ],
        };
        // Avoid circular reference: just push access constraint into $and
        query.$and = [...(query.$and || []), accessOrOwn];
      }
    }

    // Pagination
    const page = queryParams.page || 1;
    const limit = queryParams.limit || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sort: any = {};
    if (queryParams.sortBy) {
      sort[queryParams.sortBy] = queryParams.sortOrder === 'asc' ? 1 : -1;
    } else {
      // Default sorting: pinned first, then by creation date
      sort.isPinned = -1;
      sort.createdAt = -1;
    }

    // Execute query with pagination
    const [announcements, totalItems] = await Promise.all([
      this.announcementModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'firstName lastName')
        .populate('campuses', 'name')
        .populate('rooms', 'name')
        .populate('deletedBy', 'firstName lastName')
        .exec(),
      this.announcementModel.countDocuments(query).exec()
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      data: announcements,
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage,
      hasPreviousPage
    };
  }

  async findOne(id: string, currentUser: User): Promise<Announcement> {
    const announcement = await this.announcementModel
      .findById(id)
      .populate('createdBy', 'firstName lastName')
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .exec();

    if (!announcement) {
      throw new NotFoundException(`Announcement with ID '${id}' not found`);
    }

    // Admin can see everything; others must match assignment only (no global)
    if (currentUser.role === UserRole.ADMINISTRATOR) return announcement;

    const userCampusIds = (currentUser.campuses || []).map((c: any) => c?.toString());
    const userRoomIds = (currentUser.rooms || []).map((r: any) => r?.toString());

    const hasCampus = (announcement.campuses || []).some((ac: any) =>
      userCampusIds.includes((ac?._id || ac).toString()),
    );
    const hasRoom = (announcement.rooms || []).some((r: any) =>
      userRoomIds.includes((r?._id || r).toString()),
    );

    if (hasCampus || hasRoom) return announcement;

    throw new ForbiddenException('You do not have access to this announcement');
  }

  async findLikeCount(id: string): Promise<Announcement> {
    const announcement = await this.announcementModel
      .findById(id)
      .populate('createdBy', 'firstName lastName')
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .exec();

    if (!announcement) {
      throw new NotFoundException(`Announcement with ID '${id}' not found`);
    }

    return announcement;
  }

  async update(id: string, updateAnnouncementDto: UpdateAnnouncementDto, currentUser: User): Promise<Announcement> {
    const announcement = await this.announcementModel.findById(id).exec();
    
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID '${id}' not found`);
    }

    // Check if user has permission to update this announcement
    if (
      currentUser.role !== UserRole.ADMINISTRATOR &&
      currentUser.role !== UserRole.AREA_MANAGER &&
      !compareObjectIds(announcement.createdBy, currentUser._id)
    ) {
      throw new ForbiddenException('You do not have permission to update this announcement');
    }

    const updatedAnnouncement = await this.announcementModel
      .findByIdAndUpdate(id, updateAnnouncementDto, { new: true })
      .populate('createdBy', 'firstName lastName')
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .exec();

    // Send notifications to parents if campuses changed or status transitioned to PUBLISHED
    if (updatedAnnouncement.status === AnnouncementStatus.PUBLISHED) {
      try {
        const isForAllCampuses = updatedAnnouncement.scope === AnnouncementScope.ALL;
        const campuses = isForAllCampuses ? [] : (updatedAnnouncement.campuses?.map((c: any) => {
          return typeof c === 'object' && c !== null && '_id' in c ? c._id.toString() : c.toString();
        }) || []);

        const wasStatusUpdated = updateAnnouncementDto.status === AnnouncementStatus.PUBLISHED;
        const campusesChanged = Array.isArray(updateAnnouncementDto.campuses);
        if (wasStatusUpdated || campusesChanged) {
          const campusIds = isForAllCampuses
            ? []
            : campuses.map((c: any) => (typeof c === 'string' ? c : String(c)));
          if (campusIds.length === 0) {
            // Skip for ALL
          } else {
            for (const campusId of campusIds) {
              try {
                await this.notificationsService.sendByCampus(
                  campusId,
                  wasStatusUpdated ? 'New Announcement' : 'Announcement Updated',
                  updatedAnnouncement.shortDescription || updatedAnnouncement.title,
                  {
                    refModel: 'Announcement',
                    relatedEntityId: updatedAnnouncement._id.toString(),
                    event: wasStatusUpdated ? 'created' : 'updated',
                    meta: { url: `/announcements/${updatedAnnouncement._id.toString()}` },
                    recipientRole: 'parent',
                  },
                );
              } catch (notificationError) {
                console.error(`Failed to send announcement notifications for campus ${campusId}:`, notificationError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to send announcement notifications for update:', error);
      }
    }
      
    return updatedAnnouncement;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const announcement = await this.announcementModel.findById(id).exec();
    
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID '${id}' not found`);
    }

    // Check if user has permission to delete this announcement
    if (
      currentUser.role !== UserRole.ADMINISTRATOR &&
      currentUser.role !== UserRole.AREA_MANAGER &&
      !compareObjectIds(announcement.createdBy, currentUser._id)
    ) {
      throw new ForbiddenException('You do not have permission to delete this announcement');
    }

    // Soft delete
    announcement.isDeleted = true;
    announcement.deletedAt = new Date();
    announcement.deletedBy = currentUser._id as any;
    await announcement.save();

    // Feed updates handled by AutoFeed interceptor
  }

  async bulkAction(bulkActionDto: BulkActionDto, currentUser: User): Promise<{ success: boolean; affected: number; message: string }> {
    const { ids, action } = bulkActionDto;

    // Verify all announcements exist and user has permission
    const announcements = await this.announcementModel.find({
      _id: { $in: ids }
    }).exec();

    if (announcements.length !== ids.length) {
      throw new NotFoundException('One or more announcements not found');
    }

    // Check permissions for each announcement
    const unauthorizedIds = announcements
      .filter(announcement => 
        currentUser.role !== UserRole.ADMINISTRATOR &&
        currentUser.role !== UserRole.AREA_MANAGER &&
        !compareObjectIds(announcement.createdBy, currentUser._id)
      )
      .map(announcement => announcement._id.toString());

    if (unauthorizedIds.length > 0) {
      throw new ForbiddenException(`You do not have permission to perform this action on ${unauthorizedIds.length} announcement(s)`);
    }

    let updateData: any = {};
    let message = '';

    switch (action) {
      case BulkAction.DELETE:
        updateData = {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: currentUser._id
        };
        message = `${announcements.length} announcement(s) moved to trash`;
        break;

      case BulkAction.PUBLISH:
        updateData = {
          status: AnnouncementStatus.PUBLISHED,
          publishDate: new Date()
        };
        message = `${announcements.length} announcement(s) published`;
        break;

      case BulkAction.UNPUBLISH:
        updateData = {
          status: AnnouncementStatus.DRAFT
        };
        message = `${announcements.length} announcement(s) unpublished`;
        break;

      case BulkAction.MOVE_TO_TRASH:
        updateData = {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: currentUser._id
        };
        message = `${announcements.length} announcement(s) moved to trash`;
        break;

      case BulkAction.RESTORE_FROM_TRASH:
        updateData = {
          isDeleted: false,
          deletedAt: undefined,
          deletedBy: undefined
        };
        message = `${announcements.length} announcement(s) restored from trash`;
        break;

      case BulkAction.PIN:
        updateData = { isPinned: true };
        message = `${announcements.length} announcement(s) pinned`;
        break;

      case BulkAction.UNPIN:
        updateData = { isPinned: false };
        message = `${announcements.length} announcement(s) unpinned`;
        break;

      default:
        throw new Error(`Unknown bulk action: ${action}`);
    }

    const result = await this.announcementModel.updateMany(
      { _id: { $in: ids } },
      updateData
    ).exec();

    return {
      success: true,
      affected: result.modifiedCount,
      message
    };
  }

  async permanentDelete(id: string, currentUser: User): Promise<void> {
    const announcement = await this.announcementModel.findById(id).exec();
    
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID '${id}' not found`);
    }

    // Check if user has permission to permanently delete this announcement
    if (
      currentUser.role !== UserRole.ADMINISTRATOR &&
      currentUser.role !== UserRole.AREA_MANAGER &&
      !compareObjectIds(announcement.createdBy, currentUser._id)
    ) {
      throw new ForbiddenException('You do not have permission to permanently delete this announcement');
    }

    // Only allow permanent deletion if the announcement is already in trash
    if (!announcement.isDeleted) {
      throw new ForbiddenException('Can only permanently delete announcements that are in trash');
    }

    await this.announcementModel.deleteOne({ _id: id }).exec();
  }

  async togglePin(id: string, currentUser: User): Promise<Announcement> {
    const announcement = await this.announcementModel.findById(id).exec();
    
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID '${id}' not found`);
    }

    // Check if user has permission to pin/unpin this announcement
    if (
      currentUser.role !== UserRole.ADMINISTRATOR &&
      currentUser.role !== UserRole.AREA_MANAGER &&
      currentUser.role !== UserRole.DIRECTOR &&
      currentUser.role !== UserRole.ASSISTANT_DIRECTOR &&
      !compareObjectIds(announcement.createdBy, currentUser._id)
    ) {
      throw new ForbiddenException('You do not have permission to pin/unpin this announcement');
    }

    announcement.isPinned = !announcement.isPinned;
    return announcement.save();
  }

  async toggleActive(id: string, currentUser: User): Promise<Announcement> {
    const announcement = await this.announcementModel.findById(id).exec();
    
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID '${id}' not found`);
    }

    // Check if user has permission to activate/deactivate this announcement
    if (
      currentUser.role !== UserRole.ADMINISTRATOR &&
      currentUser.role !== UserRole.AREA_MANAGER &&
      currentUser.role !== UserRole.DIRECTOR &&
      currentUser.role !== UserRole.ASSISTANT_DIRECTOR &&
      !compareObjectIds(announcement.createdBy, currentUser._id)
    ) {
      throw new ForbiddenException('You do not have permission to activate/deactivate this announcement');
    }

    announcement.isActive = !announcement.isActive;
    return announcement.save();
  }

  /**
   * Update comment count for an announcement without permission checks
   * This method is used by the comments service to update counts
   */
  async updateCommentCount(announcementId: string, increment: number): Promise<void> {
    await this.announcementModel.findByIdAndUpdate(
      announcementId,
      { $inc: { commentCount: increment } }
    );
  }

  /**
   * Update like count for an announcement without permission checks
   * This method is used by the comments service to update counts
   */
  async updateLikeCount(announcementId: string, increment: number): Promise<void> {
    await this.announcementModel.findByIdAndUpdate(
      announcementId,
      { $inc: { likeCount: increment } }
    );
  }

  // Feed syncing is handled centrally by AutoFeed interceptor
}