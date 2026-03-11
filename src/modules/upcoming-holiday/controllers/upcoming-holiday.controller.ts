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
import { UpcomingHolidayService } from '../services/upcoming-holiday.service';
import { CreateUpcomingHolidayDto } from '../dto/create-upcoming-holiday.dto';
import { UpdateUpcomingHolidayDto } from '../dto/update-upcoming-holiday.dto';
import { QueryUpcomingHolidayDto } from '../dto/query-upcoming-holiday.dto';
import { UpcomingHoliday } from '../schemas/upcoming-holiday.schema';

@ApiTags('upcoming-holiday')
@Controller('upcoming-holiday')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class UpcomingHolidayController {
  constructor(
    private readonly upcomingHolidayService: UpcomingHolidayService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an upcoming holiday request' })
  @ApiResponse({
    status: 201,
    description: 'Upcoming holiday request created successfully',
  })
  create(
    @Body() dto: CreateUpcomingHolidayDto,
    @CurrentUser() currentUser: User,
  ): Promise<UpcomingHoliday> {
    return this.upcomingHolidayService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get upcoming holiday requests' })
  @ApiResponse({
    status: 200,
    description: 'Return upcoming holiday requests',
  })
  findAll(
    @Query() query: QueryUpcomingHolidayDto,
  ): Promise<UpcomingHoliday[]> {
    return this.upcomingHolidayService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get upcoming holiday request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return upcoming holiday request',
  })
  findOne(
    @Param('id') id: string,
  ): Promise<UpcomingHoliday> {
    return this.upcomingHolidayService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update upcoming holiday request' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming holiday request updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUpcomingHolidayDto,
  ): Promise<UpcomingHoliday> {
    return this.upcomingHolidayService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete upcoming holiday request' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming holiday request deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Upcoming holiday not found' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    await this.upcomingHolidayService.remove(id);
    return { success: true };
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for upcoming holiday' })
  @ApiResponse({
    status: 200,
    description:
      'Return unique year-month combinations for upcoming holiday records',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.upcomingHolidayService.findArchiveMonths();
  }
}




