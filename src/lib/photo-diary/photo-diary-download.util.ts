import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import {
  requireObjectId,
  toObjectIdArray,
} from '../mongoose/object-id.util';
import { streamRemoteFilesAsZip } from '../download/remote-zip.util';
import {
  DailyJournal,
  DailyJournalStatus,
} from '../../modules/daily-journal/schemas/daily-journal.schema';
import { Media } from '../../modules/media/media.entity';
import {
  ALLOWED_MEDIA_EXTENSIONS,
  ALLOWED_MEDIA_TYPES,
} from './photo-diary.constants';
import { PhotoVisibility } from '../../modules/photos/schemas/photos.schema';

export type PhotoDiaryModels = {
  dailyJournalModel: Model<DailyJournal>;
  mediaModel: Model<Media>;
};

export const generatePhotoDiaryToken = (): string =>
  randomBytes(24).toString('hex');

export const computePhotoDiaryExpiry = (
  configService: ConfigService,
): Date => {
  const ttlDays =
    Number(configService.get('PHOTO_DIARY_TOKEN_TTL_DAYS')) ||
    Number(configService.get('PHOTO_DOWNLOAD_TOKEN_TTL_DAYS')) ||
    7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);
  return expiresAt;
};

export const buildPhotoDiaryDownloadUrl = (
  configService: ConfigService,
  id: string,
  token: string,
): string => {
  const base =
    configService.get<string>('photoDiary.downloadBaseUrl') ||
    configService.get<string>('PHOTO_DIARY_DOWNLOAD_BASE_URL') ||
    configService.get<string>('BACKEND_URL') ||
    configService.get<string>('frontend.url') ||
    'http://localhost:4000/api';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}/photos/${id}/download?token=${token}`;
};

const isAllowedUrl = (value: string): boolean => {
  const lower = value.toLowerCase();
  return ALLOWED_MEDIA_EXTENSIONS.some((ext) => lower.includes(ext));
};

export const getPhotoDiaryMediaUrls = async (
  models: PhotoDiaryModels,
  campus: Types.ObjectId,
  room: Types.ObjectId,
  children: Types.ObjectId[],
  year: number,
): Promise<string[]> => {
  if (!children.length) {
    return [];
  }

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const journals = await models.dailyJournalModel
    .find({
      isDeleted: false,
      campus,
      room,
      child: { $in: children },
      date: { $gte: start, $lt: end },
      photos: { $exists: true, $not: { $size: 0 } },
    })
    .select('photos status')
    .lean()
    .exec();

  const values = new Set<string>();
  journals.forEach((journal: any) => {
    if (
      journal.status !== DailyJournalStatus.PUBLISH &&
      journal.status !== 'Publish' &&
      journal.status !== 'PUBLISH'
    ) {
      return;
    }
    (journal.photos || []).forEach((photo: string) => {
      if (photo) {
        values.add(String(photo));
      }
    });
  });

  if (!values.size) {
    return [];
  }

  const raw = Array.from(values);
  const mediaIds = raw.filter(
    (value) => Types.ObjectId.isValid(value) && value.length === 24,
  );

  const mediaDocs = mediaIds.length
    ? await models.mediaModel
        .find({
          _id: { $in: mediaIds },
          isDeleted: false,
          type: { $in: ALLOWED_MEDIA_TYPES },
        })
        .select('url type')
        .lean()
        .exec()
    : [];

  const allowedIdSet = new Set(mediaDocs.map((doc) => String(doc._id)));
  const uniqueUrls = new Set<string>();

  mediaDocs.forEach((doc) => {
    if (doc.url) {
      uniqueUrls.add(doc.url);
    }
  });

  raw.forEach((value) => {
    if (allowedIdSet.has(value)) {
      return;
    }
    if (!Types.ObjectId.isValid(value) || value.length !== 24) {
      if (isAllowedUrl(value)) {
        uniqueUrls.add(value);
      }
    }
  });

  return Array.from(uniqueUrls);
};

export type PhotoDiaryDocumentLike = {
  _id: Types.ObjectId | string;
  campus: unknown;
  room: unknown;
  children: unknown[];
  excludeChildren?: unknown[];
  year: number;
  downloadToken?: string;
  downloadExpiresAt?: Date;
  visibility?: string;
};

export const resolveVisibleChildren = (
  childrenInput: unknown[],
  excludeInput?: unknown[],
): Types.ObjectId[] => {
  const children = toObjectIdArray(childrenInput || [], 'children');
  const excluded = excludeInput
    ? toObjectIdArray(excludeInput, 'excludeChildren')
    : [];
  const excludedIds = new Set(excluded.map((id) => id.toHexString()));
  return children.filter((child) => !excludedIds.has(child.toHexString()));
};

export type PhotoDiaryPreparationResult = {
  downloadToken: string;
  downloadExpiresAt: Date;
  downloadUrl: string;
  mediaCount: number;
  mediaUrls: string[];
  visibleChildren: Types.ObjectId[];
};

export const preparePhotoDiaryDownload = async (
  params: {
    models: PhotoDiaryModels;
    configService: ConfigService;
    photo: PhotoDiaryDocumentLike;
  },
): Promise<PhotoDiaryPreparationResult> => {
  const { models, configService, photo } = params;

  const visibleChildren = resolveVisibleChildren(
    photo.children || [],
    photo.excludeChildren,
  );
  if (!visibleChildren.length) {
    throw new NotFoundException('No children available for download');
  }

  const campusId = requireObjectId(photo.campus, 'campus');
  const roomId = requireObjectId(photo.room, 'room');

  const mediaUrls = await getPhotoDiaryMediaUrls(
    models,
    campusId,
    roomId,
    visibleChildren,
    photo.year,
  );

  const downloadToken = generatePhotoDiaryToken();
  const downloadExpiresAt = computePhotoDiaryExpiry(configService);
  const downloadUrl = buildPhotoDiaryDownloadUrl(
    configService,
    String(photo._id),
    downloadToken,
  );

  return {
    downloadToken,
    downloadExpiresAt,
    downloadUrl,
    mediaCount: mediaUrls.length,
    mediaUrls,
    visibleChildren,
  };
};

export const streamPhotoDiaryArchive = async (
  params: {
    models: PhotoDiaryModels;
    photo: PhotoDiaryDocumentLike;
    token: string;
    res: Response;
    currentUser?: unknown;
  },
): Promise<void> => {
  const { models, photo, token, res, currentUser } = params;

  if (!photo.downloadToken || photo.downloadToken !== token) {
    throw new ForbiddenException('Invalid download token');
  }
  if (
    photo.downloadExpiresAt &&
    new Date(photo.downloadExpiresAt).getTime() < Date.now()
  ) {
    throw new ForbiddenException('Download link has expired');
  }

  const visibleChildren = resolveVisibleChildren(
    photo.children || [],
    photo.excludeChildren,
  );

  if (!visibleChildren.length) {
    throw new NotFoundException('No children available for download');
  }

  const campusId = requireObjectId(photo.campus, 'campus');
  const roomId = requireObjectId(photo.room, 'room');

  const mediaUrls = await getPhotoDiaryMediaUrls(
    models,
    campusId,
    roomId,
    visibleChildren,
    photo.year,
  );

  if (!mediaUrls.length) {
    res.status(200).json({
      message: 'No media available for download',
      mediaCount: 0,
      year: photo.year,
    });
    return;
  }

  await streamRemoteFilesAsZip(
    res,
    mediaUrls,
    `photo-diary-${photo.year}.zip`,
  );
};
