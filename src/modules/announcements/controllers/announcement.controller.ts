import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
  UsePipes,
  UploadedFiles,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { AnnouncementService } from '../services/announcement.service';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/update-announcement.dto';
import { QueryAnnouncementsDto } from '../dto/query-announcements.dto';
import { SaveDraftDto } from '../dto/save-draft.dto';
import { BulkActionDto } from '../dto/bulk-operations.dto';
import { PaginatedAnnouncementsDto } from '../dto/paginated-announcements.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../users/schemas/user.schema';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AutoFeed } from '../../auto-feed/auto-feed.decorator';
import { CommentsService } from '../../comments/services/comments.service';
import { Inject, forwardRef } from '@nestjs/common';

@ApiTags('announcements')
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class AnnouncementController {
  constructor(
    private readonly announcementService: AnnouncementService,
    @Inject(forwardRef(() => CommentsService))
    private readonly commentsService: CommentsService,
  ) {}

  @Post()
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ASSISTANT_DIRECTOR,
    UserRole.EDUCATIONAL_LEADER,
    UserRole.CENTRE_LOGIN,
  )
  @ApiOperation({ summary: 'Create a new announcement' })
  @ApiResponse({ status: 201, description: 'Announcement created successfully' })
  @AutoFeed({ type: 'announcement', action: 'create' })
  create(
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.announcementService.create(createAnnouncementDto, currentUser);
  }

  @Post('draft')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ASSISTANT_DIRECTOR,
    UserRole.EDUCATIONAL_LEADER,
    UserRole.CENTRE_LOGIN,
  )
  @ApiOperation({ summary: 'Save announcement as draft' })
  @ApiResponse({ status: 201, description: 'Draft saved successfully' })
  saveDraft(
    @Body() saveDraftDto: SaveDraftDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.announcementService.saveDraft(saveDraftDto, currentUser);
  }

  @Patch(':id/publish')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ASSISTANT_DIRECTOR,
    UserRole.EDUCATIONAL_LEADER,
    UserRole.CENTRE_LOGIN,
  )
  @ApiOperation({ summary: 'Publish an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement published successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  @AutoFeed({ type: 'announcement', action: 'update' })
  publish(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.announcementService.publish(id, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all announcements with filtering, pagination, and search' })
  @ApiResponse({ status: 200, description: 'Return paginated filtered announcements', type: PaginatedAnnouncementsDto })
  findAll(
    @Query() queryParams: QueryAnnouncementsDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedAnnouncementsDto> {
    return this.announcementService.findAll(queryParams, currentUser);
  }

  @Get('published/by-campuses')
  @ApiOperation({ summary: 'Get published announcements by campus IDs' })
  @ApiResponse({ status: 200, description: 'Returns published announcements for specified campuses' })
  getPublishedByCampuses(
    @Query('campusIds') campusIds: string,
    @CurrentUser() currentUser: User,
  ) {
    const campusIdArray = campusIds ? campusIds.split(',') : [];
    return this.announcementService.getPublishedByCampuses(campusIdArray, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an announcement by ID' })
  @ApiResponse({ status: 200, description: 'Return the announcement' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.announcementService.findOne(id, currentUser);
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ASSISTANT_DIRECTOR,
    UserRole.EDUCATIONAL_LEADER,
    UserRole.CENTRE_LOGIN,
  )
  @ApiOperation({ summary: 'Update an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement updated successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  @AutoFeed({ type: 'announcement', action: 'update' })
  update(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.announcementService.update(id, updateAnnouncementDto, currentUser);
  }

  @Delete(':id')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ASSISTANT_DIRECTOR,
  )
  @ApiOperation({ summary: 'Soft delete an announcement (move to trash)' })
  @ApiResponse({ status: 200, description: 'Announcement moved to trash successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  @AutoFeed({ type: 'announcement', action: 'delete' })
  remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.announcementService.remove(id, currentUser);
  }

  @Post('bulk-action')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ASSISTANT_DIRECTOR,
    UserRole.EDUCATIONAL_LEADER,
    UserRole.CENTRE_LOGIN,
  )
  @ApiOperation({ summary: 'Perform bulk actions on multiple announcements' })
  @ApiResponse({ status: 200, description: 'Bulk action completed successfully' })
  @ApiResponse({ status: 404, description: 'One or more announcements not found' })
  bulkAction(
    @Body() bulkActionDto: BulkActionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.announcementService.bulkAction(bulkActionDto, currentUser);
  }

  @Delete(':id/permanent')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
  )
  @ApiOperation({ summary: 'Permanently delete an announcement from trash' })
  @ApiResponse({ status: 200, description: 'Announcement permanently deleted successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  permanentDelete(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.announcementService.permanentDelete(id, currentUser);
  }

  @Patch(':id/toggle-pin')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ASSISTANT_DIRECTOR,
    UserRole.EDUCATIONAL_LEADER,
  )
  @ApiOperation({ summary: 'Toggle pin status of an announcement' })
  @ApiResponse({ status: 200, description: 'Pin status toggled successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  togglePin(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.announcementService.togglePin(id, currentUser);
  }

  @Patch(':id/toggle-active')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ASSISTANT_DIRECTOR,
    UserRole.EDUCATIONAL_LEADER,
  )
  @ApiOperation({ summary: 'Toggle active status of an announcement' })
  @ApiResponse({ status: 200, description: 'Active status toggled successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  toggleActive(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.announcementService.toggleActive(id, currentUser);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for an announcement' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async getComments(@Param('id') id: string, @CurrentUser() currentUser: User) {
    // This will be handled by the comments controller, but we can add a redirect here
    // or implement it directly if needed
    return { message: 'Use /comments/announcement/:id endpoint' };
  }

  @Get(':id/likes')
  @ApiOperation({ summary: 'Get like count for an announcement' })
  @ApiResponse({ status: 200, description: 'Like count retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async getLikeCount(@Param('id') id: string) {
    const announcement = await this.announcementService.findLikeCount(id);
    return { 
      announcementId: id, 
      likeCount: announcement.likeCount || 0,
      commentCount: announcement.commentCount || 0 
    };
  }

  @Get(':id/liked-users')
  @ApiOperation({ summary: 'Get list of users who liked an announcement' })
  @ApiResponse({ status: 200, description: 'Users who liked the announcement retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Type of entity', enum: ['announcement', 'event', 'dailyJournal', 'yearReport'] })
  async getLikedUsers(
    @Param('id') id: string,
    @Query('entityType') entityType: string = 'announcement',
    @CurrentUser() currentUser: User,
  ) {
    await this.announcementService.findOne(id, currentUser);
    const users = await this.commentsService.getUsersWhoLiked(
      id,
      entityType as 'announcement' | 'event' | 'dailyJournal' | 'yearReport',
      currentUser,
    );
    return {
      announcementId: id,
      entityType,
      totalLikes: users.length,
      users,
    };
  }

  @Get(':id/commented-users')
  @ApiOperation({ summary: 'Get list of unique users who commented on an announcement' })
  @ApiResponse({ status: 200, description: 'Users who commented on the announcement retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Type of entity', enum: ['announcement', 'event', 'dailyJournal', 'yearReport'] })
  async getCommentedUsers(
    @Param('id') id: string,
    @Query('entityType') entityType: string = 'announcement',
    @CurrentUser() currentUser: User,
  ) {
    await this.announcementService.findOne(id, currentUser);
    const users = await this.commentsService.getUsersWhoCommented(
      id,
      entityType as 'announcement' | 'event' | 'dailyJournal' | 'yearReport',
      currentUser,
    );
    return {
      announcementId: id,
      entityType,
      totalUsers: users.length,
      users,
    };
  }
}
