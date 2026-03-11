import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Photos, PhotoStatus } from '../schemas/photos.schema';
import { User } from '../../users/schemas/user.schema';
import { CreatePhotosDto } from '../dto/create-photos.dto';
import { UpdatePhotosDto } from '../dto/update-photos.dto';
import { QueryPhotosDto, PhotoSortOrder } from '../dto/query-photos.dto';
import { objectIdInArray } from '../../../utils/mongoose-helper';
import {
  buildStrictCampusInFilterByIds,
  isAdministrator,
} from '../../../common/access/access-filter.util';
import {
  DailyJournal,
} from '../../daily-journal/schemas/daily-journal.schema';
import { Media } from '../../media/media.entity';
import { EmailService } from '../../email/services/email.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import {
  requireObjectId,
  toObjectId,
  toObjectIdArray,
} from '../../../lib/mongoose/object-id.util';
import {
  preparePhotoDiaryDownload,
  streamPhotoDiaryArchive,
  PhotoDiaryDocumentLike,
} from '../../../lib/photo-diary/photo-diary-download.util';

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    @InjectModel(Photos.name) private readonly photosModel: Model<Photos>,
    @InjectModel(DailyJournal.name)
    private readonly dailyJournalModel: Model<DailyJournal>,
    @InjectModel(Media.name) private readonly mediaModel: Model<Media>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) { }

  async create(
    createPhotosDto: CreatePhotosDto,
    currentUser: User,
  ): Promise<Photos> {
    if (!isAdministrator(currentUser)) {
      const userCampuses = (currentUser.campuses || []) as any[];
      if (!objectIdInArray(createPhotosDto.campus, userCampuses)) {
        throw new ForbiddenException('You do not have access to this campus.');
      }
    }

    const campusId = requireObjectId(createPhotosDto.campus, 'campus');
    const roomId = requireObjectId(createPhotosDto.room, 'room');
    const children = toObjectIdArray(
      createPhotosDto.children || [],
      'children',
    );
    const excludedChildrenRaw =
      createPhotosDto.excludeChildren && createPhotosDto.excludeChildren.length
        ? toObjectIdArray(createPhotosDto.excludeChildren, 'excludeChildren')
        : [];

    const excludedChildren = excludedChildrenRaw.length
      ? excludedChildrenRaw
      : undefined;

    const status = createPhotosDto.status ?? PhotoStatus.DRAFT;
    const publishedAt = status === PhotoStatus.PUBLISHED ? new Date() : null;

    const currentUserId = toObjectId((currentUser as any)?._id);
    const createdBy =
      currentUserId ??
      requireObjectId(createPhotosDto.createdBy, 'createdBy');
    const updatedBy = currentUserId
      ? currentUserId
      : toObjectId(createPhotosDto.updatedBy);

    const doc = new this.photosModel({
      campus: campusId as unknown as Types.ObjectId,
      room: roomId as unknown as Types.ObjectId,
      children: children as unknown as Types.ObjectId[],
      excludeChildren: excludedChildren as unknown as Types.ObjectId[] | undefined,
      year: createPhotosDto.year,
      sendTo: createPhotosDto.sendTo,
      createdBy: createdBy as any,
      updatedBy: updatedBy as any,
      isDeleted: createPhotosDto.isDeleted ?? false,
      status,
      publishedAt,
    });

    if (createPhotosDto.visibility) {
      doc.visibility = createPhotosDto.visibility;
    }

    const preparation = await preparePhotoDiaryDownload({
      models: {
        dailyJournalModel: this.dailyJournalModel,
        mediaModel: this.mediaModel,
      },
      configService: this.configService,
      photo: {
        _id: String(doc._id),
        campus: doc.campus as any,
        room: doc.room as any,
        children: (doc.children || []) as unknown[],
        excludeChildren: (doc.excludeChildren || []) as unknown[],
        year: doc.year,
      },
    });

    doc.mediaCount = preparation.mediaCount;

    if (preparation.mediaCount > 0) {
      doc.downloadToken = preparation.downloadToken;
      doc.downloadExpiresAt = preparation.downloadExpiresAt;
      doc.downloadRequestedAt = new Date();
      doc.downloadUrl = preparation.downloadUrl;
    }

    const created = await doc.save();

    if (preparation.mediaCount > 0 && status === PhotoStatus.PUBLISHED) {
      this.emailService
        .sendPhotoDiaryDownloadEmail(
          createPhotosDto.sendTo,
          preparation.downloadUrl,
          preparation.downloadExpiresAt,
          preparation.mediaCount,
          String(created._id),
        )
        .catch((error) => {
          this.logger.error(
            `Failed to send photo diary download email: ${error.message}`,
          );
        });
    }

    return created;
  }

  async findAll(query: QueryPhotosDto, currentUser: User): Promise<Photos[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const sortField = query.sortBy ?? 'updatedAt';
    const sortOrder = query.sortOrder === PhotoSortOrder.ASC ? 1 : -1;

    const filters: any = { isDeleted: false };

    if (query.campus) {
      filters.campus = requireObjectId(query.campus, 'campus');
    }

    if (query.room) {
      filters.room = requireObjectId(query.room, 'room');
    }

    if (query.child) {
      filters.children = requireObjectId(query.child, 'child');
    }

    if (query.status) {
      filters.status = query.status;
    }

    if (query.search) {
      filters.$or = [{ sendTo: { $regex: query.search, $options: 'i' } }];
    }

    if (!isAdministrator(currentUser)) {
      if (!currentUser.campuses || currentUser.campuses.length === 0) {
        return [];
      }
      const campusFilter = buildStrictCampusInFilterByIds(
        currentUser.campuses as any,
        'campus',
      );
      Object.assign(filters, campusFilter);
    }

    return this.photosModel
      .find(filters)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('excludeChildren', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
  }

  async findOne(id: string, currentUser: User): Promise<Photos> {
    const photo = await this.photosModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('excludeChildren', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();

    if (!photo) {
      throw new NotFoundException(`Photo with ID '${id}' not found`);
    }

    if (!isAdministrator(currentUser)) {
      if (
        !objectIdInArray(
          (photo.campus as any)?._id ?? photo.campus,
          (currentUser.campuses || []) as any[],
        )
      ) {
        throw new ForbiddenException('You do not have access to this campus.');
      }
    }

    return photo;
  }

  async streamDownload(
    id: string,
    token: string,
    res: Response,
    currentUser?: User,
  ): Promise<void> {
    const photo = await this.photosModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .lean();
    if (!photo) {
      throw new NotFoundException(`Photo with ID '${id}' not found`);
    }

    const visibility = photo.visibility || 'public';
    if (visibility === 'private') {
      if (!currentUser) {
        throw new ForbiddenException('Authentication required for private photo diary download');
      }
      if (!isAdministrator(currentUser)) {
        const userEmail = (currentUser as any).email?.toLowerCase()?.trim();
        const sendToEmail = photo.sendTo?.toLowerCase()?.trim();
        if (!userEmail || !sendToEmail || userEmail !== sendToEmail) {
          throw new ForbiddenException('You do not have access to this private photo diary download');
        }
      }
    }

    const downloadPhoto = photo as unknown as PhotoDiaryDocumentLike;

    await streamPhotoDiaryArchive({
      models: {
        dailyJournalModel: this.dailyJournalModel,
        mediaModel: this.mediaModel,
      },
      photo: downloadPhoto,
      token,
      res,
      currentUser,
    });

    await this.photosModel
      .updateOne({ _id: id }, { $set: { downloadCompletedAt: new Date() } })
      .exec();
  }

  async update(
    id: string,
    updatePhotosDto: UpdatePhotosDto,
    currentUser: User,
  ): Promise<Photos> {
    const photo = await this.photosModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .exec();
    if (!photo) {
      throw new NotFoundException(`Photo with ID '${id}' not found`);
    }

    if (!isAdministrator(currentUser)) {
      if (
        !objectIdInArray(
          (photo.campus as any)?._id ?? photo.campus,
          (currentUser.campuses || []) as any[],
        )
      ) {
        throw new ForbiddenException('You do not have access to this campus.');
      }
    }

    const currentUserId = toObjectId((currentUser as any)?._id);
    if (currentUserId) {
      photo.updatedBy = currentUserId as any;
    } else if (updatePhotosDto.updatedBy) {
      photo.updatedBy = requireObjectId(updatePhotosDto.updatedBy, 'updatedBy') as any;
    }

    let refreshNeeded = false;
    let emailNeedsSend = false;

    if (updatePhotosDto.campus) {
      if (
        !isAdministrator(currentUser) &&
        !objectIdInArray(
          updatePhotosDto.campus,
          (currentUser.campuses || []) as any[],
        )
      ) {
        throw new ForbiddenException('You do not have access to this campus.');
      }
      photo.campus = requireObjectId(updatePhotosDto.campus, 'campus') as any;
      refreshNeeded = true;
    }

    if (updatePhotosDto.room) {
      photo.room = requireObjectId(updatePhotosDto.room, 'room') as any;
      refreshNeeded = true;
    }

    if (updatePhotosDto.children !== undefined) {
      photo.children = toObjectIdArray(
        updatePhotosDto.children,
        'children',
      ) as any;
      refreshNeeded = true;
    }

    if (updatePhotosDto.excludeChildren !== undefined) {
      photo.excludeChildren = updatePhotosDto.excludeChildren.length
        ? (toObjectIdArray(
            updatePhotosDto.excludeChildren,
            'excludeChildren',
          ) as any)
        : ([] as any);
      refreshNeeded = true;
    }

    if (updatePhotosDto.year !== undefined) {
      photo.year = updatePhotosDto.year;
      refreshNeeded = true;
    }

    if (updatePhotosDto.sendTo !== undefined) {
      photo.sendTo = updatePhotosDto.sendTo;
      emailNeedsSend = true;
    }

    if (updatePhotosDto.downloadSchedule !== undefined) {
      photo.downloadSchedule = updatePhotosDto.downloadSchedule
        ? new Date(updatePhotosDto.downloadSchedule)
        : null;
    }

    if (updatePhotosDto.status !== undefined) {
      const wasPublished = photo.status === PhotoStatus.PUBLISHED;
      photo.status = updatePhotosDto.status;
      photo.publishedAt =
        updatePhotosDto.status === PhotoStatus.PUBLISHED ? new Date() : null;
      if (
        updatePhotosDto.status === PhotoStatus.PUBLISHED &&
        !wasPublished &&
        photo.downloadUrl &&
        (photo.mediaCount ?? 0) > 0
      ) {
        emailNeedsSend = true;
      }
    }

    if (updatePhotosDto.visibility !== undefined) {
      photo.visibility = updatePhotosDto.visibility;
    }

    if (updatePhotosDto.isDeleted !== undefined) {
      photo.isDeleted = updatePhotosDto.isDeleted;
    }

    if (refreshNeeded || !photo.downloadToken) {
      const preparation = await preparePhotoDiaryDownload({
        models: {
          dailyJournalModel: this.dailyJournalModel,
          mediaModel: this.mediaModel,
        },
        configService: this.configService,
        photo: {
          _id: (photo._id as unknown as Types.ObjectId),
          campus: photo.campus as any,
          room: photo.room as any,
          children: (photo.children || []) as unknown[],
          excludeChildren: (photo.excludeChildren || []) as unknown[],
          year: photo.year,
        },
      });

      photo.mediaCount = preparation.mediaCount;

      if (preparation.mediaCount > 0) {
        photo.downloadToken = preparation.downloadToken;
        photo.downloadExpiresAt = preparation.downloadExpiresAt;
        photo.downloadRequestedAt = new Date();
        photo.downloadUrl = preparation.downloadUrl;
        photo.downloadCompletedAt = undefined;

        emailNeedsSend = true;
      } else {
        photo.downloadToken = undefined;
        photo.downloadExpiresAt = undefined;
        photo.downloadRequestedAt = undefined;
        photo.downloadUrl = undefined;
        photo.downloadCompletedAt = undefined;
        emailNeedsSend = false;
      }
    }

    if (
      emailNeedsSend &&
      photo.downloadUrl &&
      photo.downloadExpiresAt &&
      (photo.mediaCount ?? 0) > 0 &&
      photo.status === PhotoStatus.PUBLISHED
    ) {
      this.emailService
        .sendPhotoDiaryDownloadEmail(
          photo.sendTo,
          photo.downloadUrl,
          photo.downloadExpiresAt,
          photo.mediaCount ?? 0,
          String(photo._id),
        )
        .catch((error) => {
          this.logger.error(
            `Failed to send photo diary download email: ${error.message}`,
          );
        });
    }

    await photo.save();
    return photo;
  }

  async remove(id: string, currentUser: User): Promise<Photos> {
    const existing = await this.photosModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .exec();
    if (!existing) {
      throw new NotFoundException(`Photo with ID '${id}' not found`);
    }

    if (!isAdministrator(currentUser)) {
      if (
        !objectIdInArray(
          (existing.campus as any)?._id ?? existing.campus,
          (currentUser.campuses || []) as any[],
        )
      ) {
        throw new ForbiddenException('You do not have access to this campus.');
      }
    }

    const removed = await this.photosModel
      .findByIdAndUpdate(
        id,
        {
          isDeleted: true,
          updatedBy: (currentUser as any)._id ?? existing.updatedBy,
        },
        { new: true },
      )
      .exec();

    if (!removed) {
      throw new NotFoundException(`Photo with ID '${id}' not found`);
    }

    return removed;
  }
}
