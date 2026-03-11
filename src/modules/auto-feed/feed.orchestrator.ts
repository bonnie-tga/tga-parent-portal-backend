import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { FeedService } from '../feed/feed.service';
import { ModelMapper } from './model.mapper';
import { AutoFeedOptions } from './auto-feed.decorator';

type Action = 'create' | 'update' | 'delete' | 'archive';

@Injectable()
export class FeedOrchestrator {
  private readonly logger = new Logger(FeedOrchestrator.name);

  constructor(private feed: FeedService, private mapper: ModelMapper) {}

  async process(ctx: { options: AutoFeedOptions; result: any; userId: string; method: string }) {
    const action: Action = ctx.options.action ?? this.inferAction(ctx.method);
    const payload = this.mapper.toFeedPayload(ctx.options.type, ctx.result, action);
    if (!payload) {
      this.logger.debug(`No payload generated for ${ctx.options.type} with action ${action}`);
      return;
    }

    if (!payload.refId || !Types.ObjectId.isValid(payload.refId)) {
      const entityId = ctx.result?._id || ctx.result?.id || 'unknown';
      this.logger.warn(
        `Invalid refId for ${ctx.options.type} (action: ${action}). refId: ${payload.refId}, Entity ID: ${entityId}, Method: ${ctx.method}`,
      );
      return;
    }

    const refObjectId = new Types.ObjectId(payload.refId);
    const typeToModel: Record<string, string> = {
      poll: 'Poll',
      announcement: 'Announcement',
      event: 'Event',
      survey: 'Survey',
      'daily-journal': 'DailyJournal',
      breakfast: 'Breakfast',
      'grove-curriculum': 'GroveCurriculum',
      'year-report': 'YearReport',
      'learning-journey': 'LearningJourney',
    };

    if (action === 'delete') {
      await this.feed['feedItemModel'].updateMany(
        { type: payload.type, refId: refObjectId },
        { $set: { isDeleted: true } },
      );
      return;
    }

    if (action === 'archive') {
      await this.feed['feedItemModel'].updateMany(
        { type: payload.type, refId: refObjectId },
        { $set: { status: 'archived' } },
      );
      return;
    }

    // If target status is archived, do not create new feed entries; only update existing ones
    if (payload.status === 'archived') {
      await this.feed['feedItemModel'].updateOne(
        { type: payload.type, refId: refObjectId },
        {
          $set: {
            // do not override refId with string; ensure ObjectId and refModel are set
            type: payload.type,
            refId: refObjectId,
            refModel: typeToModel[payload.type],
            title: payload.title,
            description: payload.description,
            isForAllCampuses: payload.isForAllCampuses,
            campuses: (payload.campuses || [])
              .filter((id) => id && Types.ObjectId.isValid(id))
              .map((id) => new Types.ObjectId(id)),
            visibleFrom: payload.visibleFrom ? new Date(payload.visibleFrom) : null,
            visibleUntil: payload.visibleUntil ? new Date(payload.visibleUntil) : null,
            mediaUrls: payload.mediaUrls || [],
            isPinned: payload.isPinned ?? false,
            status: 'archived',
            isDeleted: false,
          },
        },
        { upsert: false },
      );
      return;
    }

    // Active status → upsert/create if missing
    await this.feed['feedItemModel'].updateOne(
      { type: payload.type, refId: refObjectId },
      {
        $set: {
          type: payload.type,
          refId: refObjectId,
          refModel: typeToModel[payload.type],
          title: payload.title,
          description: payload.description,
          isForAllCampuses: payload.isForAllCampuses,
          campuses: (payload.campuses || [])
            .filter((id) => id && Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id)),
          createdBy: ctx.userId && Types.ObjectId.isValid(ctx.userId) ? new Types.ObjectId(ctx.userId) : undefined,
          visibleFrom: payload.visibleFrom ? new Date(payload.visibleFrom) : null,
          visibleUntil: payload.visibleUntil ? new Date(payload.visibleUntil) : null,
          mediaUrls: payload.mediaUrls || [],
          isPinned: payload.isPinned ?? false,
          status: 'active',
          isDeleted: false,
        },
      },
      { upsert: true },
    );
  }

  private inferAction(method: string): Action {
    switch (method) {
      case 'POST':
        return 'create';
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'update';
    }
  }
}


