// src/media/media.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { model, Model, Types } from 'mongoose';
import { Media, MediaType, MediaStatus } from './media.entity';
import { User, UserRole } from './../users/schemas/user.schema';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { CreateMediaDto } from './media.dto';

@Injectable()
export class MediaService {
  constructor(@InjectModel(Media.name) private mediaModel: Model<Media>) {}

  async softDeleteByCampus(mediaId: string, currentUser: User): Promise<Media> {
    // Find media first
    const media = await this.mediaModel.findById(mediaId);

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Allow administrators to bypass campus restrictions
    if (currentUser?.role === UserRole.ADMINISTRATOR) {
      media.isDeleted = true;
      await media.save();
      return media;
    }

    // ✅ Check campus access
    const userCampusIds = currentUser.campuses.map((c) => c.toString());
    const mediaCampusIds = media.campuses.map((c) => c.toString());

    const hasAccess = mediaCampusIds.some((id) => userCampusIds.includes(id));
    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have permission to delete this media.',
      );
    }

    media.isDeleted = true;
    await media.save();

    return media;
  }

  async hardDeleteByCampus(mediaId: string, currentUser: User): Promise<void> {
    const media = await this.mediaModel.findById(mediaId);

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Allow administrators to bypass campus restrictions
    if (currentUser?.role === UserRole.ADMINISTRATOR) {
      await this.mediaModel.deleteOne({ _id: mediaId });
      return;
    }

    const userCampusIds = currentUser.campuses.map((c) => c.toString());
    const mediaCampusIds = media.campuses.map((c) => c.toString());
    const hasAccess = mediaCampusIds.some((id) => userCampusIds.includes(id));

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have permission to delete this media.',
      );
    }

    await this.mediaModel.deleteOne({ _id: mediaId });
  }

  async findAllWithFilters(
    filters: {
      page: number;
      limit: number;
      status?: string | string[];
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      mediaType?: MediaType | MediaType[];
      dateRange?: 'all' | 'today' | 'this_week' | 'this_month';
      search?: string;
    },
    currentUser: User,
  ): Promise<PaginatedDto<Media>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      mediaType,
      dateRange,
      search,
    } = filters;

    const skip = (page - 1) * limit;

    // Build filter query
    let query: any = {
      isDeleted: false, // 👈 ignore deleted ones
    };

    // Campus restriction applies to non-admins only
    if (currentUser?.role !== UserRole.ADMINISTRATOR) {
      query.campuses = { $in: currentUser?.campuses?.map((c) => c.toString()) };
    }

    // Normalize and apply media type filter if provided
    if (mediaType) {
      const mediaTypes = Array.isArray(mediaType) ? mediaType : [mediaType];
      const normalizedTypes = mediaTypes
        .map((type) => String(type).toLowerCase())
        .filter((type) =>
          (Object.values(MediaType) as string[]).includes(type),
        ) as MediaType[];
      if (normalizedTypes.length > 0) {
        query.type = normalizedTypes.length === 1 ? normalizedTypes[0] : { $in: normalizedTypes };
      }
    }

    // Apply date range filter if provided
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date;

      if (dateRange === 'today') {
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      } else if (dateRange === 'this_week') {
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth();
        const date = now.getUTCDate();
        const dayOfWeek = now.getUTCDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const mondayUTCDate = date + mondayOffset;
        const mondayDate = new Date(Date.UTC(year, month, mondayUTCDate, 0, 0, 0, 0));
        startDate = mondayDate;
        const sundayUTCDate = mondayUTCDate + 6;
        const sundayDate = new Date(Date.UTC(year, month, sundayUTCDate, 23, 59, 59, 999));
        endDate = sundayDate;
      } else if (dateRange === 'this_month') {
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth();
        const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month, lastDayOfMonth, 23, 59, 59, 999));
      }

      if (startDate) {
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Search by name - check originalName, filename, and URL filename part
    if (search) {
      // Escape special regex characters
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Match filename in URL: target the part after /announcements/ and before ?
      // Pattern: /announcements/...{search}...?
      const urlFilenamePattern = `/announcements/[^?]*${escapedSearch}[^?]*`;
      
      query.$or = [
        { originalName: { $regex: escapedSearch, $options: 'i' } },
        { filename: { $regex: escapedSearch, $options: 'i' } },
        { url: { $regex: urlFilenamePattern, $options: 'i' } },
      ];
    }

    // Create sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [Media, totalCount] = await Promise.all([
      this.mediaModel.find(query).skip(skip).limit(limit).sort(sort).populate('uploadedBy', 'firstName lastName email').populate('campuses', 'name').exec(),
      this.mediaModel.countDocuments(query),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Return paginated result
    return {
      data: Media,
      meta: {
        totalItems: totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: totalPages,
      },
    };
  }


  async findMediaById(id: string, currentUser: User): Promise<Media> {
    const media = await this.mediaModel.findById(id).populate('uploadedBy', 'firstName lastName email').populate('campuses', 'name');

    if (!media || media.isDeleted) {
      throw new NotFoundException('Media not found');
    }

    // Admin can view any media
    if (currentUser.role === UserRole.ADMINISTRATOR) {
      return media;
    }

    const userCampusIds = (currentUser.campuses || []).map((c) => c.toString());
    const mediaCampusIds = (media.campuses || []).map((c) => c.toString());

    const hasAccess = mediaCampusIds.some((campusId) => userCampusIds.includes(campusId));
    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have permission to view this media.',
      );
    }

    return media;
  }

  async createMedia(
    file: Express.Multer.File,
    url: string,
    gcsPath: string,
    uploadedBy: User,
    announcementId?: string,
    metadata?: any,
  ): Promise<Media> {
    const mediaType = this.getMediaType(file.mimetype);

    const mediaData: any = {
      filename: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: url,
      gcsPath: gcsPath,
      type: mediaType,
      uploadedBy: uploadedBy._id,
      createdBy: uploadedBy._id,
      metadata: metadata || {},
    };

    if (announcementId) {
      mediaData.announcement = new Types.ObjectId(announcementId);
    }

    // Extract image dimensions if it's an image
    if (mediaType === MediaType.IMAGE) {
      const dimensions = await this.getImageDimensions(file);
      if (dimensions) {
        mediaData.width = dimensions.width;
        mediaData.height = dimensions.height;
      }
    }

    const media = new this.mediaModel(mediaData);
    return media.save();
  }

  async create(
    mediaUrls: string[],
    type: CreateMediaDto,
    user: User,
    sizes?: number[],
  ): Promise<Media[]> {
    if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
      throw new BadRequestException('No media URLs provided');
    }
    const mediaPromises = mediaUrls.map((url, index) => {
      const media = new this.mediaModel({
        url,
        type: type.type,
        campuses: type.campuses ?? type.campuses,
        uploadedBy: user._id,
        createdBy: user._id,
        size: sizes?.[index],
      });
      return media.save();
    });
    return Promise.all(mediaPromises);
  }

  async createMultipleMedia(
    files: Express.Multer.File[],
    urls: string[],
    gcsPaths: string[],
    uploadedBy: User,
    announcementId?: string,
  ): Promise<Media[]> {
    const mediaPromises = files.map((file, index) =>
      this.createMedia(
        file,
        urls[index],
        gcsPaths[index],
        uploadedBy,
        announcementId,
      ),
    );

    return Promise.all(mediaPromises);
  }

  async findByAnnouncementId(announcementId: string): Promise<Media[]> {
    return this.mediaModel
      .find({
        announcement: new Types.ObjectId(announcementId),
        status: MediaStatus.ACTIVE,
      })
      .populate('uploadedBy', 'firstName lastName email')
      .exec();
  }

  async findById(id: string): Promise<Media | null> {
    return this.mediaModel
      .findById(id)
      .populate('uploadedBy', 'firstName lastName email')
      .populate('announcement', 'title')
      .exec();
  }

  async deleteMedia(id: string, deletedBy: User): Promise<Media> {
    return this.mediaModel.findByIdAndUpdate(
      id,
      {
        status: MediaStatus.DELETED,
        deletedAt: new Date(),
        deletedBy: deletedBy._id,
      },
      { new: true },
    );
  }

  async permanentlyDeleteMedia(id: string): Promise<void> {
    await this.mediaModel.findByIdAndDelete(id);
  }

  async updateMedia(
    id: string,
    updateData: Partial<Media>,
  ): Promise<Media | null> {
    return this.mediaModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  private getMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) {
      return MediaType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return MediaType.VIDEO;
    } else if (mimeType.startsWith('audio/')) {
      return MediaType.AUDIO;
    } else if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('text')
    ) {
      return MediaType.DOCUMENT;
    } else {
      return MediaType.OTHER;
    }
  }

  private async getImageDimensions(
    file: Express.Multer.File,
  ): Promise<{ width: number; height: number } | null> {
    // In a real implementation, you might use a library like 'sharp' or 'image-size'
    // For now, return null - you can implement this based on your needs
    return null;
  }
}
