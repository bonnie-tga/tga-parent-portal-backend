import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';
import { CommentsService } from '../services/comments.service';
import { 
  CreateCommentDto, 
  ReplyCommentDto, 
  UpdateCommentStatusDto, 
  UpdateCommentDto,
  QueryCommentsDto, 
  LikeAnnouncementDto,
  MarkSeenDto,
} from '../dto/comments.dto';

@ApiTags('Comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment on an announcement' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.createComment(createCommentDto, user);
  }

  @Post('reply')
  @ApiOperation({ summary: 'Reply to a comment (staff only)' })
  @ApiResponse({ status: 201, description: 'Reply created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - staff only' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async replyToComment(
    @Body() replyDto: ReplyCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.replyToComment(replyDto, user);
  }

  @Get('announcement/:announcementId')
  @ApiOperation({ summary: 'Get comments for a specific announcement, event, dailyJournal, or yearReport' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Type of entity', enum: ['announcement', 'event', 'dailyJournal', 'yearReport'] })
  @ApiQuery({ name: 'parentId', required: false, description: 'Filter by parent ID (staff only)' })
  async getCommentsForAnnouncement(
    @Param('announcementId') announcementId: string,
    @Query('entityType') entityType: string = 'announcement',
    @Query('parentId') parentId: string | undefined,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.getCommentsForAnnouncement(
      announcementId,
      user,
      entityType as 'announcement' | 'event' | 'dailyJournal' | 'yearReport',
      parentId,
    );
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get comments for staff dashboard' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - staff only' })
  @ApiQuery({ name: 'announcementId', required: false, description: 'Filter by announcement ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by comment status' })
  @ApiQuery({ name: 'parentId', required: false, description: 'Filter by parent ID' })
  @ApiQuery({ name: 'campusId', required: false, description: 'Filter by campus ID' })
  @ApiQuery({ name: 'includeDeleted', required: false, description: 'Include deleted comments' })
  @ApiQuery({ name: 'onlyNew', required: false, description: 'Filter to threads with new/unread comments' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getCommentsForDashboard(
    @Query() queryDto: QueryCommentsDto,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.getCommentsForDashboard(queryDto, user);
  }

  @Post('mark-seen')
  @ApiOperation({ summary: 'Mark comment thread as seen (staff only)' })
  @ApiResponse({ status: 201, description: 'Thread marked as seen' })
  @ApiResponse({ status: 403, description: 'Forbidden - staff only' })
  async markThreadSeen(
    @Body() dto: MarkSeenDto,
    @CurrentUser() user: User,
  ) {
    await this.commentsService.markThreadSeen(dto.announcementId, dto.entityType, user, dto.parentId);
    return { ok: true };
  }

  @Put(':commentId/status')
  @ApiOperation({ summary: 'Update comment status (staff only)' })
  @ApiResponse({ status: 200, description: 'Comment status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - staff only' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async updateCommentStatus(
    @Param('commentId') commentId: string,
    @Body() statusDto: UpdateCommentStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.updateCommentStatus(commentId, statusDto, user);
  }

  @Put(':commentId')
  @ApiOperation({ summary: 'Update comment content' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateDto: UpdateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.updateComment(commentId, updateDto, user);
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: User,
  ) {
    await this.commentsService.deleteComment(commentId, user);
  }

  @Post('like')
  @ApiOperation({ summary: 'Like or unlike an announcement' })
  @ApiResponse({ status: 200, description: 'Like status updated successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async likeAnnouncement(
    @Body() likeDto: LikeAnnouncementDto,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.likeAnnouncement(likeDto, user);
  }

  @Get('like-status/:announcementId')
  @ApiOperation({ summary: 'Check if user has liked an announcement, event, dailyJournal, or yearReport' })
  @ApiResponse({ status: 200, description: 'Like status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Type of entity', enum: ['announcement', 'event', 'dailyJournal', 'yearReport'] })
  async checkLikeStatus(
    @Param('announcementId') announcementId: string,
    @Query('entityType') entityType: string = 'announcement',
    @CurrentUser() user: User,
  ) {
    return this.commentsService.checkUserLikeStatus(announcementId, entityType as 'announcement' | 'event' | 'dailyJournal' | 'yearReport', user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get comment statistics (staff only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - staff only' })
  @ApiQuery({ name: 'campusId', required: false, description: 'Filter by campus ID' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type', enum: ['announcement', 'event', 'dailyJournal', 'yearReport'] })
  async getCommentStats(
    @Query('campusId') campusId: string | undefined,
    @Query('entityType') entityType: string | undefined,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.getCommentStats(campusId, user, entityType);
  }
}
