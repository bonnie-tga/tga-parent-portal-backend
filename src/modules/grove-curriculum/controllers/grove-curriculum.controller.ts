import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { GroveCurriculumService } from '../services/grove-curriculum.service';
import { CreateGroveCurriculumDto } from '../dto/create-grove-curriculum.dto';
import { GetSpontaneousLearningDto } from '../dto/get-spontaneous-learning.dto';
import { UpdateGroveCurriculumDto } from '../dto/update-grove-curriculum.dto';
import { GetGroveCurriculumDto } from '../dto/get-grove-curriculum.dto';
import { User } from '../../users/schemas/user.schema';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { AutoFeed } from '../../auto-feed/auto-feed.decorator';

@ApiTags('grove-curriculum')
@Controller('grove-curriculum')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class GroveCurriculumController {
  constructor(private readonly groveCurriculumService: GroveCurriculumService) {}

  @Get('spontaneous-learning')
  @ApiOperation({
    summary: 'Get Spontaneous Learning data from Daily Journal for Grove Curriculum',
    description: 'Extracts Spontaneous Learning from published Daily Journals where "Add to Curriculum" is checked. Groups by Grove Theory and returns only Date and Title. Filters by month, year, campus, and room.',
  })
  @ApiResponse({
    status: 200,
    description: 'Spontaneous Learning data grouped by Grove Theory (groveBody, groveMind, groveHeart, groveCompass, groveExpression)',
  })
  @ApiResponse({ status: 404, description: 'Campus or Room not found' })
  getSpontaneousLearning(
    @Query() queryParams: GetSpontaneousLearningDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.groveCurriculumService.getSpontaneousLearningFromDailyJournal(queryParams, currentUser);
  }

  @Get()
  @ApiOperation({
    summary: 'Get grove curriculum by month, year, campus, and room',
    description: 'Fetches a grove curriculum entry from the grove curriculum table based on query parameters. Returns a user-friendly message if not found.',
  })
  @ApiResponse({
    status: 200,
    description: 'Grove curriculum entry found or message if not found',
  })
  @ApiResponse({ status: 404, description: 'Campus or Room not found' })
  async findOne(
    @Query() queryParams: GetGroveCurriculumDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.groveCurriculumService.findOne(queryParams);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get grove curriculum by ID',
    description: 'Fetches a grove curriculum entry by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Grove curriculum entry found',
  })
  @ApiResponse({ status: 404, description: 'Grove curriculum not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  async findById(@Param('id') id: string) {
    return this.groveCurriculumService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new grove curriculum entry' })
  @ApiResponse({ status: 201, description: 'Grove curriculum entry created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Campus or Room not found' })
  @AutoFeed({ type: 'grove-curriculum', action: 'create' })
  create(
    @Body() createGroveCurriculumDto: CreateGroveCurriculumDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.groveCurriculumService.create(createGroveCurriculumDto, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a grove curriculum entry' })
  @ApiResponse({ status: 200, description: 'Grove curriculum entry updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Grove curriculum entry, Campus, or Room not found' })
  @AutoFeed({ type: 'grove-curriculum', action: 'update' })
  update(
    @Param('id') id: string,
    @Body() updateGroveCurriculumDto: UpdateGroveCurriculumDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.groveCurriculumService.update(id, updateGroveCurriculumDto, currentUser);
  }
}

