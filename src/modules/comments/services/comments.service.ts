import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentStatus, StaffReplyAs } from '../schemas/comment.schema';
import { Like } from '../schemas/like.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { Event } from '../../event/schema/event.schema';
import { CreateCommentDto, ReplyCommentDto, UpdateCommentStatusDto, UpdateCommentDto, QueryCommentsDto, LikeAnnouncementDto } from '../dto/comments.dto';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { AnnouncementService } from '../../announcements/services/announcement.service';
import { Notification } from '../../notifications/schemas/notification.schema';
import { DailyJournal } from 'src/modules/daily-journal/schemas/daily-journal.schema';
import { YearReport } from 'src/modules/year-report/schemas/year-report.schema';
import { CommentThreadSeen } from '../schemas/comment-thread-seen.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Like.name) private likeModel: Model<Like>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(DailyJournal.name) private dailyJournalModel: Model<DailyJournal>,
    @InjectModel(YearReport.name) private yearReportModel: Model<YearReport>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(CommentThreadSeen.name) private threadSeenModel: Model<CommentThreadSeen>,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => AnnouncementService))
    private announcementService: AnnouncementService,
  ) {}

  async createComment(createCommentDto: CreateCommentDto, currentUser: User): Promise<Comment> {
    const entityType = createCommentDto.entityType || 'announcement';
    const entityId = createCommentDto.announcementId;

    // Verify entity exists and user has access
    let entity: any;
    if (entityType === 'announcement') {
      entity = await this.announcementService.findOne(entityId, currentUser);
    } else if (entityType === 'event') {
      entity = await this.eventModel.findById(entityId);
    } else if (entityType === 'dailyJournal') {
      entity = await this.dailyJournalModel.findById(entityId);
    } else if (entityType === 'yearReport') {
      entity = await this.yearReportModel.findById(entityId);
    }

    if (!entity) {
      throw new NotFoundException(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`);
    }

    // Check if comments are enabled for this entity
    const isCommentEnabled = entity.isCommentEnabled || entity.allowComments;
    if (!isCommentEnabled) {
      throw new BadRequestException(`Comments are disabled for this ${entityType}`);
    }

    // Get user's campus
    const userCampus = currentUser.campuses?.[0];
    if (!userCampus) {
      throw new BadRequestException('User must be associated with a campus');
    }

    const newComment = new this.commentModel({
      announcementId: entityId,
      entityType,
      content: createCommentDto.content,
      parentId: currentUser._id,
      campusId: userCampus,
      status: CommentStatus.PENDING,
    });

    const savedComment = await newComment.save();

    // Update entity comment count
    if (entityType === 'announcement') {
      await this.announcementService.updateCommentCount(entityId, 1);
    } else if (entityType === 'event') {
      await this.eventModel.findByIdAndUpdate(
        entityId,
        { $inc: { commentCount: 1 } }
      );
    } else if (entityType === 'dailyJournal') {
      await this.dailyJournalModel.findByIdAndUpdate(
        entityId,
        { $inc: { commentsCount: 1 } }
      );
    } else if (entityType === 'yearReport') {
      await this.yearReportModel.findByIdAndUpdate(
        entityId,
        { $inc: { commentCount: 1 } }
      );
    }

    // Send notification to staff about new comment
    // await this.notifyStaffAboutNewComment(savedComment, entity, entityType);

    // Populate parent details before returning
    const populatedComment = await this.commentModel
      .findById(savedComment._id)
      .populate('parentId', 'firstName lastName email')
      .exec();

    return populatedComment;
  }

  async replyToComment(replyDto: ReplyCommentDto, currentUser: User): Promise<Comment> {
    // Find the parent comment
    const parentComment = await this.commentModel.findById(replyDto.commentId);
    if (!parentComment) {
      throw new NotFoundException('Comment not found');
    }

    // Verify user has permission to reply (staff only)
    if (!this.isStaffUser(currentUser)) {
      throw new ForbiddenException('Only staff can reply to comments');
    }

    // Get user's campus
    const userCampus = currentUser.campuses?.[0];
    if (!userCampus) {
      throw new BadRequestException('User must be associated with a campus');
    }

    const reply = new this.commentModel({
      announcementId: parentComment.announcementId,
      parentId: parentComment.parentId, // Reply to the original parent
      content: replyDto.content,
      entityType: parentComment.entityType, // Keep same entityType as parent comment
      status: CommentStatus.APPROVED, // Staff replies are auto-approved
      isStaffReply: true,
      staffReplyAs: replyDto.staffReplyAs || StaffReplyAs.GROVE_ACADEMY,
      repliedBy: currentUser._id,
      parentCommentId: parentComment._id,
      campusId: userCampus,
    });

    const savedReply = await reply.save();

    // Auto-approve the parent comment if it was pending
    if (parentComment.status === CommentStatus.PENDING) {
      await this.commentModel.findByIdAndUpdate(parentComment._id, {
        status: CommentStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: currentUser._id,
      });
    }

    // Update entity comment count
    if (parentComment.entityType === 'announcement') {
      await this.announcementService.updateCommentCount(parentComment.announcementId.toString(), 1);
    } else if (parentComment.entityType === 'event') {
      await this.eventModel.findByIdAndUpdate(
        parentComment.announcementId,
        { $inc: { commentCount: 1 } }
      );
    } else if (parentComment.entityType === 'dailyJournal') {
      await this.dailyJournalModel.findByIdAndUpdate(
        parentComment.announcementId,
        { $inc: { commentsCount: 1 } }
      );
    } else if (parentComment.entityType === 'yearReport') {
      await this.yearReportModel.findByIdAndUpdate(
        parentComment.announcementId,
        { $inc: { commentCount: 1 } }
      );
    }

    // Send notification to parent about reply
    await this.notifyParentAboutReply(savedReply, parentComment);

    // Populate parent details before returning
    const populatedReply = await this.commentModel
      .findById(savedReply._id)
      .populate('parentId', 'firstName lastName email')
      .populate('repliedBy', 'firstName lastName email')
      .exec();

    return populatedReply;
  }

  async getCommentsForAnnouncement(
    announcementId: string,
    currentUser: User,
    entityType: 'announcement' | 'event' | 'dailyJournal' | 'yearReport' = 'announcement',
    parentId?: string,
  ): Promise<Comment[]> {
    // Verify entity exists
    let entity: any;
    if (entityType === 'announcement') {
      entity = await this.announcementService.findOne(announcementId, currentUser);
    } else if (entityType === 'event') {
      entity = await this.eventModel.findById(announcementId);
    } else if (entityType === 'dailyJournal') {
      entity = await this.dailyJournalModel.findById(announcementId);
    } else if (entityType === 'yearReport') {
      entity = await this.yearReportModel.findById(announcementId);
    }

    if (!entity) {
      throw new NotFoundException(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`);
    }

    let query: any = {
      announcementId: new Types.ObjectId(announcementId),
      entityType,
      isDeleted: false,
    };

    // Parents only see their own comments and staff replies to their comments
    // Staff replies have parentId set to the original comment's parent
    if (currentUser.role === UserRole.PARENT) {
      query.parentId = currentUser._id;
    }
    // Staff see all comments for moderation
    else if (this.isStaffUser(currentUser)) {
      if (parentId) {
        if (!Types.ObjectId.isValid(parentId)) {
          throw new BadRequestException('Invalid parentId');
        }
        query.parentId = new Types.ObjectId(parentId);
      }
    } else {
      throw new ForbiddenException('Access denied');
    }

    return this.commentModel
      .find(query)
      .populate('parentId', 'firstName lastName')
      .populate('repliedBy', 'firstName lastName')
      .sort({ createdAt: 1 })
      .exec();
  }

  async getCommentsForDashboard(queryDto: QueryCommentsDto, currentUser: User): Promise<{
    comments: (Record<string, any> & { isNew: boolean })[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!this.isStaffUser(currentUser)) {
      throw new ForbiddenException('Only staff can access dashboard comments');
    }

    const filter: any = {
      isDeleted: queryDto.includeDeleted ? { $in: [true, false] } : false,
    };

    if (queryDto.announcementId) {
      filter.announcementId = new Types.ObjectId(queryDto.announcementId);
    }

    if (queryDto.status) {
      filter.status = queryDto.status;
    }

    if (queryDto.parentId) {
      filter.parentId = new Types.ObjectId(queryDto.parentId);
    }

    if (queryDto.campusId) {
      filter.campusId = new Types.ObjectId(queryDto.campusId);
    }

    if (queryDto.entityType) {
      filter.entityType = queryDto.entityType;
    }

    if (queryDto.search) {
      filter.content = { $regex: queryDto.search, $options: 'i' };
    }

    let effectiveFilter = { ...filter };
    if (queryDto.onlyNew) {
      const newThreads = await this.getNewThreadIdsForStaff(filter, currentUser._id.toString());
      if (newThreads.length === 0) {
        return {
          comments: [],
          total: 0,
          page: queryDto.page || 1,
          limit: queryDto.limit || 20,
        };
      }
      effectiveFilter = {
        ...filter,
        $or: newThreads.map((t) => ({
          announcementId: t.announcementId,
          entityType: t.entityType,
          parentId: t.parentId,
        })),
      };
    }

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const skip = (page - 1) * limit;

    const sortField = queryDto.sortBy || 'createdAt';
    const sortOrder = queryDto.sortOrder === 'asc' ? 1 : -1;

    const groupId = { announcementId: '$announcementId', entityType: '$entityType', parentId: '$parentId' };
    const [threadAgg, totalAgg, newThreads] = await Promise.all([
      this.commentModel.aggregate([
        { $match: effectiveFilter },
        { $sort: { [sortField]: sortOrder } },
        {
          $group: {
            _id: groupId,
            lastCommentId: { $first: '$_id' },
            lastSortValue: { $first: `$${sortField}` },
          },
        },
        { $sort: { lastSortValue: sortOrder } },
        { $skip: skip },
        { $limit: limit },
      ]),
      this.commentModel.aggregate([
        { $match: effectiveFilter },
        { $group: { _id: groupId } },
        { $count: 'total' },
      ]),
      this.getNewThreadIdsForStaff(filter, currentUser._id.toString()),
    ]);

    const total = totalAgg.length > 0 && typeof totalAgg[0].total === 'number' ? totalAgg[0].total : 0;
    const commentIds = threadAgg.map((t: { lastCommentId: Types.ObjectId }) => t.lastCommentId);
    let comments: Comment[] = [];
    if (commentIds.length > 0) {
      const fetched = await this.commentModel
        .find({ _id: { $in: commentIds } })
        .populate('parentId', 'firstName lastName email')
        .populate('announcementId', 'title')
        .populate('repliedBy', 'firstName lastName')
        .populate('campusId', 'name')
        .exec();

      const commentMap = new Map<string, Comment>();
      for (const comment of fetched) {
        commentMap.set(comment._id.toString(), comment);
      }
      comments = commentIds
        .map((id: Types.ObjectId) => commentMap.get(id.toString()))
        .filter((comment): comment is Comment => Boolean(comment));
    }

    // Create a Set of new thread keys for O(1) lookup
    const newThreadKeys = new Set(
      newThreads.map((t) => `${t.announcementId.toString()}_${t.entityType}_${t.parentId.toString()}`)
    );

    // Add isNew flag to each comment
    const commentsWithNewFlag = comments.map((comment) => {
      const parentIdValue = (comment.parentId as any)?._id || comment.parentId;
      const parentIdStr = parentIdValue ? parentIdValue.toString() : '';
      const threadKey = `${comment.announcementId.toString()}_${comment.entityType}_${parentIdStr}`;
      const commentObj = comment.toObject();
      return {
        ...commentObj,
        isNew: newThreadKeys.has(threadKey),
      };
    });

    return {
      comments: commentsWithNewFlag,
      total,
      page,
      limit,
    };
  }

  private async getNewThreadIdsForStaff(
    baseFilter: Record<string, unknown>,
    staffUserId: string,
  ): Promise<Array<{ announcementId: Types.ObjectId; entityType: string; parentId: Types.ObjectId }>> {
    const agg = await this.commentModel.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: { announcementId: '$announcementId', entityType: '$entityType', parentId: '$parentId' },
          lastParentAt: {
            $max: {
              $cond: [{ $eq: ['$isStaffReply', false] }, '$createdAt', new Date(0)],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'comment_thread_seen',
          let: { aid: '$_id.announcementId', ety: '$_id.entityType', pid: '$_id.parentId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$announcementId', '$$aid'] },
                    { $eq: ['$entityType', '$$ety'] },
                    { $eq: ['$parentId', '$$pid'] },
                    { $eq: ['$userId', new Types.ObjectId(staffUserId)] },
                  ],
                },
              },
            },
            { $project: { lastSeenAt: 1 } },
          ],
          as: 'seen',
        },
      },
      {
        $match: {
          $expr: {
            $or: [
              { $eq: [{ $size: '$seen' }, 0] },
              { $gt: ['$lastParentAt', { $arrayElemAt: ['$seen.lastSeenAt', 0] }] },
            ],
          },
        },
      },
      { $project: { _id: 1 } },
    ]);
    return agg.map((r: { _id: { announcementId: Types.ObjectId; entityType: string; parentId: Types.ObjectId } }) => ({
      announcementId: r._id.announcementId,
      entityType: r._id.entityType,
      parentId: r._id.parentId,
    }));
  }

  async markThreadSeen(
    announcementId: string,
    entityType: 'announcement' | 'event' | 'dailyJournal' | 'yearReport',
    currentUser: User,
    parentId?: string,
  ): Promise<void> {
    if (!this.isStaffUser(currentUser)) {
      throw new ForbiddenException('Only staff can mark threads as seen');
    }
    if (parentId && !Types.ObjectId.isValid(parentId)) {
      throw new BadRequestException('Invalid parentId');
    }
    const now = new Date();
    const filter: Record<string, unknown> = {
      announcementId: new Types.ObjectId(announcementId),
      entityType,
      userId: currentUser._id,
    };
    if (parentId) {
      filter.parentId = new Types.ObjectId(parentId);
    }
    await this.threadSeenModel.findOneAndUpdate(
      filter,
      { $set: { lastSeenAt: now } },
      { upsert: true, new: true },
    );
  }

  async getNewThreadCountForStaff(currentUser: User, campusId?: string, entityType?: string): Promise<number> {
    if (!this.isStaffUser(currentUser)) {
      return 0;
    }
    const filter: any = { isDeleted: false };
    if (campusId) {
      filter.campusId = new Types.ObjectId(campusId);
    }
    if (entityType && entityType !== 'all') {
      filter.entityType = entityType;
    }
    const newThreads = await this.getNewThreadIdsForStaff(filter, currentUser._id.toString());
    return newThreads.length;
  }

  async updateCommentStatus(commentId: string, statusDto: UpdateCommentStatusDto, currentUser: User): Promise<Comment> {
    if (!this.isStaffUser(currentUser)) {
      throw new ForbiddenException('Only staff can update comment status');
    }

    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const updateData: any = { status: statusDto.status };

    if (statusDto.status === CommentStatus.APPROVED) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = currentUser._id;
    }

    const updatedComment = await this.commentModel.findByIdAndUpdate(commentId, updateData, { new: true });
    
    // Populate parent details before returning
    const populatedComment = await this.commentModel
      .findById(updatedComment._id)
      .populate('parentId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    return populatedComment;
  }

  async updateComment(commentId: string, updateDto: UpdateCommentDto, currentUser: User): Promise<Comment> {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Parents can only update their own comments
    if (currentUser.role === UserRole.PARENT && comment.parentId.toString() !== currentUser._id.toString()) {
      throw new ForbiddenException('You can only update your own comments');
    }

    // Staff can update any comment
    const updatedComment = await this.commentModel.findByIdAndUpdate(
      commentId,
      { content: updateDto.content },
      { new: true }
    );

    // Populate parent details before returning
    const populatedComment = await this.commentModel
      .findById(updatedComment._id)
      .populate('parentId', 'firstName lastName email')
      .populate('repliedBy', 'firstName lastName email')
      .exec();

    return populatedComment;
  }

  async deleteComment(commentId: string, currentUser: User): Promise<void> {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Parents can only delete their own comments
    if (currentUser.role === UserRole.PARENT && comment.parentId.toString() !== currentUser._id.toString()) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Staff can delete any comment
    if (currentUser.role === UserRole.PARENT || this.isStaffUser(currentUser)) {
      await this.commentModel.findByIdAndUpdate(commentId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: currentUser._id,
      });

      // Update entity comment count
      if (comment.entityType === 'announcement') {
        await this.announcementService.updateCommentCount(comment.announcementId.toString(), -1);
      } else if (comment.entityType === 'event') {
        await this.eventModel.findByIdAndUpdate(
          comment.announcementId,
          { $inc: { commentCount: -1 } }
        );
      } else if (comment.entityType === 'dailyJournal') {
        await this.dailyJournalModel.findByIdAndUpdate(
          comment.announcementId,
          { $inc: { commentsCount: -1 } }
        );
      } else if (comment.entityType === 'yearReport') {
        await this.yearReportModel.findByIdAndUpdate(
          comment.announcementId,
          { $inc: { commentCount: -1 } }
        );
      }
    } else {
      throw new ForbiddenException('Access denied');
    }
  }

  async likeAnnouncement(likeDto: LikeAnnouncementDto, currentUser: User): Promise<{ liked: boolean; likeCount: number }> {
    const entityType = likeDto.entityType || 'announcement';
    const entityId = likeDto.announcementId;

    // Verify entity exists
    let entity: any;
    if (entityType === 'announcement') {
      entity = await this.announcementService.findOne(entityId, currentUser);
    } else if (entityType === 'event') {
      entity = await this.eventModel.findById(entityId);
    } else if (entityType === 'dailyJournal') {
      entity = await this.dailyJournalModel.findById(entityId);
    } else if (entityType === 'yearReport') {
      entity = await this.yearReportModel.findById(entityId);
    }

    if (!entity) {
      throw new NotFoundException(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`);
    }

    const userCampus = currentUser.campuses?.[0];
    if (!userCampus) {
      throw new BadRequestException('User must be associated with a campus');
    }

    // Check if user already liked this entity
    const existingLike = await this.likeModel.findOne({
      announcementId: entityId,
      entityType,
      userId: currentUser._id,
      isDeleted: false,
    });

    let liked = false;

    if (existingLike) {
      // Unlike: soft delete the like
      await this.likeModel.findByIdAndUpdate(existingLike._id, {
        isDeleted: true,
      });
      
      if (entityType === 'announcement') {
        await this.announcementService.updateLikeCount(entityId, -1);
      } else if (entityType === 'event') {
        await this.eventModel.findByIdAndUpdate(
          entityId,
          { $inc: { likeCount: -1 } }
        );
      } else if (entityType === 'dailyJournal') {
        await this.dailyJournalModel.findByIdAndUpdate(
          entityId,
          { $inc: { likesCount: -1 } }
        );
      } else if (entityType === 'yearReport') {
        await this.yearReportModel.findByIdAndUpdate(
          entityId,
          { $inc: { likeCount: -1 } }
        );
      }
    } else {
      // Like: create new like or restore deleted like
      const deletedLike = await this.likeModel.findOne({
        announcementId: entityId,
        entityType,
        userId: currentUser._id,
        isDeleted: true,
      });

      if (deletedLike) {
        await this.likeModel.findByIdAndUpdate(deletedLike._id, {
          isDeleted: false,
        });
      } else {
        await this.likeModel.create({
          announcementId: entityId,
          entityType,
          userId: currentUser._id,
          campusId: userCampus,
        });
      }

      if (entityType === 'announcement') {
        await this.announcementService.updateLikeCount(entityId, 1);
      } else if (entityType === 'event') {
        await this.eventModel.findByIdAndUpdate(
          entityId,
          { $inc: { likeCount: 1 } }
        );
      } else if (entityType === 'dailyJournal') {
        await this.dailyJournalModel.findByIdAndUpdate(
          entityId,
          { $inc: { likesCount: 1 } }
        );
      } else if (entityType === 'yearReport') {
        await this.yearReportModel.findByIdAndUpdate(
          entityId,
          { $inc: { likeCount: 1 } }
        );
      }
      liked = true;
    }

    // Get updated like count
    let updatedEntity: any;
    if (entityType === 'announcement') {
      updatedEntity = await this.announcementService.findOne(entityId, currentUser);
    } else if (entityType === 'event') {
      updatedEntity = await this.eventModel.findById(entityId);
    } else if (entityType === 'dailyJournal') {
      updatedEntity = await this.dailyJournalModel.findById(entityId);
    } else if (entityType === 'yearReport') {
      updatedEntity = await this.yearReportModel.findById(entityId);
    }
    const likeCount = updatedEntity?.likeCount || updatedEntity?.likesCount || 0;

    return { liked, likeCount };
  }

  async checkUserLikeStatus(announcementId: string, entityType: 'announcement' | 'event' | 'dailyJournal' | 'yearReport', currentUser: User): Promise<{ liked: boolean; likeCount: number }> {
    let entity: any;
    if (entityType === 'announcement') {
      entity = await this.announcementService.findOne(announcementId, currentUser);
    } else if (entityType === 'event') {
      entity = await this.eventModel.findById(announcementId);
    } else if (entityType === 'dailyJournal') {
      entity = await this.dailyJournalModel.findById(announcementId);
    } else if (entityType === 'yearReport') {
      entity = await this.yearReportModel.findById(announcementId);
    }
    if (!entity) {
      throw new NotFoundException(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`);
    }
    const existingLike = await this.likeModel.findOne({
      announcementId,
      entityType,
      userId: currentUser._id,
      isDeleted: false,
    });
    const liked = !!existingLike;
    const likeCount = entity.likeCount || entity.likesCount || 0;
    return { liked, likeCount };
  }

  async getLikedRefIdsBatch(
    refs: Array<{ refId: string; entityType: 'announcement' | 'event' | 'dailyJournal' | 'yearReport' }>,
    userId: string,
  ): Promise<Set<string>> {
    if (refs.length === 0) return new Set();
    const userIdObj = new Types.ObjectId(userId);
    const orConditions = refs.map((r) => ({
      announcementId: new Types.ObjectId(r.refId),
      entityType: r.entityType,
    }));
    const likes = await this.likeModel
      .find({
        userId: userIdObj,
        isDeleted: false,
        $or: orConditions,
      })
      .select('announcementId entityType')
      .lean()
      .exec();
    const key = (id: string, type: string) => `${id}:${type}`;
    return new Set(likes.map((l: any) => key(l.announcementId.toString(), l.entityType)));
  }

  async getCommentStats(
    campusId?: string,
    currentUser?: User,
    entityType?: string,
  ): Promise<{
    total: number;
    pending: number;
    approved: number;
    trashed: number;
    newCount: number;
  }> {
    const filter: any = { isDeleted: false };
    if (campusId) {
      filter.campusId = new Types.ObjectId(campusId);
    }
    if (entityType && entityType !== 'all') {
      filter.entityType = entityType;
    }

    const [total, pending, approved, trashed, newCount] = await Promise.all([
      this.commentModel.countDocuments(filter),
      this.commentModel.countDocuments({ ...filter, status: CommentStatus.PENDING }),
      this.commentModel.countDocuments({ ...filter, status: CommentStatus.APPROVED }),
      this.commentModel.countDocuments({ ...filter, status: CommentStatus.TRASHED }),
      currentUser && this.isStaffUser(currentUser)
        ? this.getNewThreadCountForStaff(currentUser, campusId, entityType)
        : Promise.resolve(0),
    ]);

    return { total, pending, approved, trashed, newCount };
  }

  async getUsersWhoLiked(
    announcementId: string,
    entityType: 'announcement' | 'event' | 'dailyJournal' | 'yearReport' = 'announcement',
    currentUser?: User,
  ): Promise<Array<{
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      profileImage?: string;
    };
    likedAt: Date;
  }>> {
    const likes = await this.likeModel
      .find({
        announcementId: new Types.ObjectId(announcementId),
        entityType,
        isDeleted: false,
      })
      .populate('userId', 'firstName lastName email profileImage')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return likes
      .filter((like: any) => like.userId && !like.userId.isDeleted)
      .map((like: any) => ({
        user: {
          _id: like.userId._id.toString(),
          firstName: like.userId.firstName || '',
          lastName: like.userId.lastName || '',
          email: like.userId.email || '',
          profileImage: like.userId.profileImage || undefined,
        },
        likedAt: like.createdAt,
      }));
  }

  async getUsersWhoCommented(
    announcementId: string,
    entityType: 'announcement' | 'event' | 'dailyJournal' | 'yearReport' = 'announcement',
    currentUser?: User,
  ): Promise<Array<{
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      profileImage?: string;
    };
    commentCount: number;
    firstCommentedAt: Date;
    lastCommentedAt: Date;
    comments: Array<{
      _id: string;
      content: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }>> {
    const comments = await this.commentModel
      .find({
        announcementId: new Types.ObjectId(announcementId),
        entityType,
        isDeleted: false,
        isStaffReply: false,
      })
      .populate('parentId', 'firstName lastName email profileImage')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const userCommentMap = new Map<string, {
      user: any;
      commentCount: number;
      firstCommentedAt: Date;
      lastCommentedAt: Date;
      comments: Array<{
        _id: string;
        content: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      }>;
    }>();

    comments.forEach((comment: any) => {
      if (!comment.parentId || comment.parentId.isDeleted) {
        return;
      }

      const userId = comment.parentId._id.toString();
      const commentedAt = new Date(comment.createdAt);

      const commentData = {
        _id: comment._id.toString(),
        content: comment.content,
        status: comment.status,
        createdAt: new Date(comment.createdAt),
        updatedAt: new Date(comment.updatedAt),
      };

      if (userCommentMap.has(userId)) {
        const existing = userCommentMap.get(userId);
        existing.commentCount += 1;
        existing.comments.push(commentData);
        if (commentedAt < existing.firstCommentedAt) {
          existing.firstCommentedAt = commentedAt;
        }
        if (commentedAt > existing.lastCommentedAt) {
          existing.lastCommentedAt = commentedAt;
        }
      } else {
        userCommentMap.set(userId, {
          user: {
            _id: comment.parentId._id.toString(),
            firstName: comment.parentId.firstName || '',
            lastName: comment.parentId.lastName || '',
            email: comment.parentId.email || '',
            profileImage: comment.parentId.profileImage || undefined,
          },
          commentCount: 1,
          firstCommentedAt: commentedAt,
          lastCommentedAt: commentedAt,
          comments: [commentData],
        });
      }
    });

    const result = Array.from(userCommentMap.values()).sort((a, b) => 
      b.lastCommentedAt.getTime() - a.lastCommentedAt.getTime()
    );

    result.forEach((userData) => {
      userData.comments.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    });

    return result;
  }

  private isStaffUser(user: User): boolean {
    const staffRoles = [
      UserRole.ADMINISTRATOR,
      UserRole.AREA_MANAGER,
      UserRole.DIRECTOR,
      UserRole.ASSISTANT_DIRECTOR,
      UserRole.EDUCATIONAL_LEADER,
      UserRole.ENROLMENTS,
      UserRole.WHS_MEDICAL,
      UserRole.CENTRE_LOGIN,
      UserRole.ROOM_LOGIN,
      UserRole.STAFF,
      UserRole.TEACHER,
    ];
    return staffRoles.includes(user.role as UserRole);
  }

  private async notifyStaffAboutNewComment(comment: Comment, entity: any, entityType: string): Promise<void> {
    // Get all staff members who can see this entity
    const staffUsers = await this.userModel.find({
      role: { $in: [UserRole.ADMINISTRATOR, UserRole.DIRECTOR, UserRole.STAFF, UserRole.TEACHER] },
      isActive: true,
      campuses: entity.campus?.length > 0 ? { $in: entity.campus } : { $exists: true },
    });

    // Send notifications to staff
    for (const staff of staffUsers) {
      await this.notificationModel.create({
        userId: staff._id,
        campusId: comment.campusId,
        relatedEntityId: comment.announcementId,
        refModel: entityType === 'announcement' ? 'Announcement' : 'Event',
        event: 'created',
        title: 'New Comment Received',
        body: `A parent commented on "${entity.title}"`,
        meta: {
          commentId: comment._id.toString(),
          entityId: comment.announcementId.toString(),
          entityType,
          parentName: `${comment.parentId}`,
        },
        isRead: false,
        deliveryStatus: 'sent',
        channel: 'system',
      });
    }
  }

  private async notifyParentAboutReply(reply: Comment, parentComment: Comment): Promise<void> {
    await this.notificationModel.create({
      userId: parentComment.parentId,
      campusId: reply.campusId,
      relatedEntityId: reply.announcementId,
      refModel: 'Announcement',
      event: 'created',
      title: 'Reply to Your Comment',
      body: reply.staffReplyAs === StaffReplyAs.GROVE_ACADEMY 
        ? 'The Grove Academy replied to your comment'
        : 'Staff replied to your comment',
      meta: {
        commentId: reply._id.toString(),
        announcementId: reply.announcementId.toString(),
        isStaffReply: true,
      },
      isRead: false,
      deliveryStatus: 'sent',
      channel: 'system',
    });
  }
}
