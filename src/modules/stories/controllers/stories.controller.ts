import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';
import { StoriesService } from '../services/stories.service';
import { CreateStoryDto } from '../dto/create-story.dto';
import { UpdateStoryDto } from '../dto/update-story.dto';
import { QueryStoryDto } from '../dto/query-story.dto';
import { Story } from '../schemas/story.schema';

@ApiTags('stories')
@Controller('stories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class StoriesController {
  constructor(
    private readonly storiesService: StoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new story' })
  @ApiResponse({
    status: 201,
    description: 'Story created successfully',
  })
  create(
    @Body() dto: CreateStoryDto,
    @CurrentUser() currentUser: User,
  ): Promise<Story> {
    return this.storiesService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stories' })
  @ApiResponse({
    status: 200,
    description: 'Return all stories',
  })
  findAll(
    @Query() query: QueryStoryDto,
  ): Promise<Story[]> {
    return this.storiesService.findAll(query);
  }

  @Get('parent/active')
  @ApiOperation({ summary: 'Get active stories for current parent (last 24 hours)' })
  @ApiResponse({
    status: 200,
    description: 'Return active stories related to the current parent\'s children',
  })
  findActiveForParent(
    @CurrentUser() currentUser: User,
  ): Promise<Story[]> {
    return this.storiesService.findActiveForParent(currentUser);
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for stories' })
  @ApiResponse({
    status: 200,
    description: 'Return unique year-month combinations for stories',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.storiesService.findArchiveMonths();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a story by ID' })
  @ApiResponse({ status: 200, description: 'Return the story' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  findOne(@Param('id') id: string): Promise<Story> {
    return this.storiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a story' })
  @ApiResponse({
    status: 200,
    description: 'Story updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Story not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStoryDto,
    @CurrentUser() currentUser: User,
  ): Promise<Story> {
    return this.storiesService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a story' })
  @ApiResponse({
    status: 200,
    description: 'Story deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Story not found' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.storiesService.remove(id);
    return { success: true };
  }
}


