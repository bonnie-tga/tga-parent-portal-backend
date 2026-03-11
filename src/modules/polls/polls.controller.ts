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
} from '@nestjs/common';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { QueryPollDto } from './dto/query-poll.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiSecurityAuth } from '../auth/decorators/api-bearer-auth.decorator';
import { User } from '../users/schemas/user.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AutoFeed } from '../auto-feed/auto-feed.decorator';

@ApiTags('Polls')
@Controller('polls')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new poll (Admin/Staff only)' })
  @ApiResponse({ status: 201, description: 'Poll created successfully' })
  @AutoFeed({ type: 'poll', action: 'create' })
  create(@Body() createPollDto: CreatePollDto, @CurrentUser() user: User) {
    return this.pollsService.create(createPollDto, (user as any)._id.toString());
  }

  @Get()
  @ApiOperation({ summary: 'List all polls (with filtering)' })
  @ApiResponse({ status: 200, description: 'Returns list of polls' })
  list(@Query() queryDto: QueryPollDto, @CurrentUser() user: User) {
    const userCampuses = (user as any).campuses || [];
    return this.pollsService.findAll(queryDto, userCampuses, user);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active polls for current user' })
  @ApiResponse({ status: 200, description: 'Returns active polls' })
  getActive(@CurrentUser() user: User) {
    const userCampuses = (user as any).campuses || [];
    return this.pollsService.findActiveForUser(userCampuses, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single poll by ID' })
  @ApiResponse({ status: 200, description: 'Returns poll details' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  get(@Param('id') id: string, @CurrentUser() user: User) {
    const userCampuses = (user as any).campuses || [];
    return this.pollsService.findOne(id, userCampuses, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a poll (Admin/Staff only)' })
  @ApiResponse({ status: 200, description: 'Poll updated successfully' })
  @AutoFeed({ type: 'poll', action: 'update' })
  update(@Param('id') id: string, @Body() updatePollDto: UpdatePollDto) {
    return this.pollsService.update(id, updatePollDto);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive a poll (Admin/Staff only)' })
  @ApiResponse({ status: 200, description: 'Poll archived successfully' })
  archive(@Param('id') id: string) {
    return this.pollsService.archive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a poll (Admin/Staff only)' })
  @ApiResponse({ status: 200, description: 'Poll deleted successfully' })
  @AutoFeed({ type: 'poll', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.pollsService.remove(id);
  }
}

