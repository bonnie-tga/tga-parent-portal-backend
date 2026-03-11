import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventService } from '../service/event.service';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { QueryEventDto } from '../dto/query-event.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';
import { AutoFeed } from '../../auto-feed/auto-feed.decorator';

@ApiTags('event')
@Controller('event')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @ApiOperation({ summary: 'Create event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @AutoFeed({ type: 'event', action: 'create' })
  create(@Body() dto: CreateEventDto, @CurrentUser() user: User) {
    return this.eventService.create(dto, (user as any)._id.toString());
  }

  @Get()
  @ApiOperation({ summary: 'List events with pagination' })
  findAll(@Query() query: QueryEventDto, @CurrentUser() user: User) {
    return this.eventService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by id' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.eventService.findOne(id, user);
  }

  @Get('published/:campusId')
  @ApiOperation({ summary: 'List published events by campus id' })
  @ApiResponse({ status: 200, description: 'Published events fetched successfully' })
  listPublishedByCampus(@Param('campusId') campusId: string, @CurrentUser() user: User) {
    return this.eventService.listPublishedByCampus(campusId, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event' })
  @AutoFeed({ type: 'event', action: 'update' })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete event' })
  @AutoFeed({ type: 'event', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.eventService.remove(id);
  }

  @Patch(':id/like')
  @ApiOperation({ summary: 'Like/Unlike event (legacy)' })
  likeEvent(@Param('id') id: string, @CurrentUser() user: User) {
    const userId = (user as any)._id.toString();
    return this.eventService.toggleLike(id, userId, user.role);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for an event' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getComments(@Param('id') id: string, @CurrentUser() currentUser: User) {
    // This will be handled by the comments controller
    return { message: 'Use /comments/announcement/:id?entityType=event endpoint' };
  }

  @Get(':id/likes')
  @ApiOperation({ summary: 'Get like count for an event' })
  @ApiResponse({ status: 200, description: 'Like count retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getLikeCount(@Param('id') id: string, @CurrentUser() user: User) {
    const event = await this.eventService.findOne(String(id), user);
    return { 
      eventId: id, 
      likeCount: event.likeCount || 0,
      commentCount: event.commentCount || 0 
    };
  }
}


