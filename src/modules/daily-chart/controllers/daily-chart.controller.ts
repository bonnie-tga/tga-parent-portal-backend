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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DailyChartService } from '../services/daily-chart.service';
import { CreateDailyChartDto } from '../dto/create-daily-chart.dto';
import { QueryDailyChartDto } from '../dto/query-daily-chart.dto';
import { UpdateDailyChartDto } from '../dto/update-daily-chart.dto';
import { User } from 'src/modules/users/schemas/user.schema';
// import { AutoFeed } from '../../auto-feed/auto-feed.decorator';

@ApiTags('daily-chart')
@Controller('daily-chart')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DailyChartController {
  constructor(private readonly dailyChartService: DailyChartService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new daily chart' })
  @ApiResponse({ status: 201, description: 'Daily chart created successfully' })
  // @AutoFeed({ type: 'daily-chart', action: 'create' })
  create(@Body() createDailyChartDto: CreateDailyChartDto, @CurrentUser() currentUser: User) {
    return this.dailyChartService.create(createDailyChartDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all daily charts' })
  @ApiResponse({ status: 200, description: 'Return all daily charts' })
  findAll(@Query() query: QueryDailyChartDto, @CurrentUser() currentUser: User) {
    return this.dailyChartService.findAll(query, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a daily chart by ID' })
  @ApiResponse({ status: 200, description: 'Return the daily chart' })
  @ApiResponse({ status: 404, description: 'Daily chart not found' })
  findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.dailyChartService.findOne(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a daily chart' })
  @ApiResponse({ status: 200, description: 'Daily chart updated successfully' })
  @ApiResponse({ status: 404, description: 'Daily chart not found' })
  // @AutoFeed({ type: 'daily-chart', action: 'update' })
  update(@Param('id') id: string, @Body() updateDailyChartDto: UpdateDailyChartDto, @CurrentUser() currentUser: User) {
    return this.dailyChartService.update(id, updateDailyChartDto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a daily chart' })
  @ApiResponse({ status: 200, description: 'Daily chart deleted successfully' })
  @ApiResponse({ status: 404, description: 'Daily chart not found' })
  // @AutoFeed({ type: 'daily-chart', action: 'delete' })
  remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.dailyChartService.softDelete(id, currentUser);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a daily chart' })
  @ApiResponse({ status: 200, description: 'Daily chart restored successfully' })
  @ApiResponse({ status: 404, description: 'Daily chart not found' })
  restore(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.dailyChartService.restore(id, currentUser);
  }

  @Delete(':id/hard-delete')
  @ApiOperation({ summary: 'Hard delete a daily chart' })
  @ApiResponse({ status: 200, description: 'Daily chart hard deleted successfully' })
  @ApiResponse({ status: 404, description: 'Daily chart not found' })
  // @AutoFeed({ type: 'daily-chart', action: 'delete' })
    hardDelete(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.dailyChartService.remove(id, currentUser);
  }

  @Get('children/by-date')
  @ApiOperation({ summary: 'Get children by date from daily chart' })
  @ApiResponse({ status: 200, description: 'Return children for the specified date' })
  getChildrenByDate(
    @Query('date') date: string,
    @Query('room') roomId?: string,
    @Query('campus') campusId?: string,
    @CurrentUser() currentUser?: User,
  ) {
    if (!date) {
      throw new BadRequestException('Date parameter is required');
    }
    return this.dailyChartService.getChildrenByDate(date, roomId, campusId, currentUser);
  }
} 
