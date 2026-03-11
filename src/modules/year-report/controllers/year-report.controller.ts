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
import { User } from '../../users/schemas/user.schema';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AutoFeed } from '../../auto-feed/auto-feed.decorator';
import { YearReportService } from '../services/year-report.service';
import { CreateYearReportDto } from '../dto/create-year-report.dto';
import { UpdateYearReportDto } from '../dto/update-year-report.dto';
import { QueryYearReportDto } from '../dto/query-year-report.dto';
import { YearReport } from '../schemas/year-report.schema';
import { YearReportDailyJournalQueryDto } from '../dto/year-report-dailyjournal-query.dto';

@ApiTags('year-report')
@Controller('year-report')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class YearReportController {
  constructor(private readonly yearReportService: YearReportService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new year report' })
  @ApiResponse({ status: 201, description: 'Year report created successfully' })
  @AutoFeed({ type: 'year-report', action: 'create' })
  create(
    @Body() dto: CreateYearReportDto,
    @CurrentUser() currentUser: User,
  ): Promise<YearReport> {
    return this.yearReportService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all year reports' })
  @ApiResponse({ status: 200, description: 'Return all year reports' })
  findAll(@Query() query: QueryYearReportDto): Promise<YearReport[]> {
    return this.yearReportService.findAll(query);
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for year reports' })
  @ApiResponse({
    status: 200,
    description: 'Return unique year-month combinations for year reports',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.yearReportService.findArchiveMonths();
  }

  @Get('daily-journal')
  @ApiOperation({
    summary:
      'Load Individual Learning (photos + learning text) from Daily Journal for a year',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns any Individual Learning from Daily Journal for the selected year where the child is tagged.',
  })
  getFromDailyJournal(
    @Query() query: YearReportDailyJournalQueryDto,
    @CurrentUser() currentUser: User,
  ): Promise<{
    individualLearning: { date?: Date; photos?: string[]; learning?: string }[];
  }> {
    return this.yearReportService.findDailyJournalLearningsByYear(query, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a year report by ID' })
  @ApiResponse({ status: 200, description: 'Return the year report' })
  @ApiResponse({ status: 404, description: 'Year report not found' })
  findOne(@Param('id') id: string): Promise<YearReport> {
    return this.yearReportService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a year report' })
  @ApiResponse({ status: 200, description: 'Year report updated successfully' })
  @ApiResponse({ status: 404, description: 'Year report not found' })
  @AutoFeed({ type: 'year-report', action: 'update' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateYearReportDto,
    @CurrentUser() currentUser: User,
  ): Promise<YearReport> {
    return this.yearReportService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a year report' })
  @ApiResponse({ status: 200, description: 'Year report deleted successfully' })
  @ApiResponse({ status: 404, description: 'Year report not found' })
  @AutoFeed({ type: 'year-report', action: 'delete' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ success: true }> {
    await this.yearReportService.remove(id);
    return { success: true };
  }

  @Get(':id/likes')
  @ApiOperation({ summary: 'Get like and comment count for a year report' })
  @ApiResponse({ status: 200, description: 'Like and comment count retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Year report not found' })
  async getLikeCount(@Param('id') id: string) {
    const report = await this.yearReportService.findOne(id);
    return { 
      yearReportId: id, 
      likeCount: report.likeCount || 0,
      commentCount: report.commentCount || 0 
    };
  }
}


