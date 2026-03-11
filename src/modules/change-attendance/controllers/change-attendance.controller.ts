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
import { ChangeAttendanceService } from '../services/change-attendance.service';
import { CreateChangeAttendanceDto } from '../dto/create-change-attendance.dto';
import { UpdateChangeAttendanceDto } from '../dto/update-change-attendance.dto';
import { QueryChangeAttendanceDto } from '../dto/query-change-attendance.dto';
import { ChangeAttendance } from '../schemas/change-attendance.schema';

@ApiTags('change-attendance')
@Controller('change-attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class ChangeAttendanceController {
  constructor(
    private readonly changeAttendanceService: ChangeAttendanceService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a change of attendance request' })
  @ApiResponse({
    status: 201,
    description: 'Change of attendance request created successfully',
  })
  create(
    @Body() dto: CreateChangeAttendanceDto,
    @CurrentUser() currentUser: User,
  ): Promise<ChangeAttendance> {
    return this.changeAttendanceService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get change of attendance requests' })
  @ApiResponse({
    status: 200,
    description: 'Return change of attendance requests',
  })
  findAll(
    @Query() query: QueryChangeAttendanceDto,
  ): Promise<ChangeAttendance[]> {
    return this.changeAttendanceService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get change of attendance request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return change of attendance request',
  })
  findOne(
    @Param('id') id: string,
  ): Promise<ChangeAttendance> {
    return this.changeAttendanceService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update change of attendance request' })
  @ApiResponse({
    status: 200,
    description: 'Change of attendance request updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChangeAttendanceDto,
  ): Promise<ChangeAttendance> {
    return this.changeAttendanceService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete change of attendance request' })
  @ApiResponse({
    status: 200,
    description: 'Change of attendance request deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Change of attendance not found' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    await this.changeAttendanceService.remove(id);
    return { success: true };
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for change of attendance' })
  @ApiResponse({
    status: 200,
    description:
      'Return unique year-month combinations for change of attendance records',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.changeAttendanceService.findArchiveMonths();
  }
}


