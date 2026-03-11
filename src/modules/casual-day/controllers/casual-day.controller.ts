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
import { CasualDayService } from '../services/casual-day.service';
import { CreateCasualDayDto } from '../dto/create-casual-day.dto';
import { UpdateCasualDayDto } from '../dto/update-casual-day.dto';
import { QueryCasualDayDto } from '../dto/query-casual-day.dto';
import { CasualDay } from '../schemas/casual-day.schema';

@ApiTags('casual-day')
@Controller('casual-day')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class CasualDayController {
  constructor(
    private readonly casualDayService: CasualDayService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a casual day request' })
  @ApiResponse({
    status: 201,
    description: 'Casual day request created successfully',
  })
  create(
    @Body() dto: CreateCasualDayDto,
    @CurrentUser() currentUser: User,
  ): Promise<CasualDay> {
    return this.casualDayService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get casual day requests' })
  @ApiResponse({
    status: 200,
    description: 'Return casual day requests',
  })
  findAll(
    @Query() query: QueryCasualDayDto,
  ): Promise<CasualDay[]> {
    return this.casualDayService.findAll(query);
  }

  @Get('parent/:parentId')
  @ApiOperation({
    summary: 'Get all casual day requests for a specific parent',
  })
  @ApiResponse({
    status: 200,
    description: 'Return casual day requests submitted by the given parent',
  })
  findAllByParent(
    @Param('parentId') parentId: string,
    @Query() query: QueryCasualDayDto,
  ): Promise<CasualDay[]> {
    const mergedQuery: QueryCasualDayDto = {
      ...query,
      parent: parentId,
    };
    return this.casualDayService.findAll(mergedQuery);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get casual day request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return casual day request',
  })
  findOne(
    @Param('id') id: string,
  ): Promise<CasualDay> {
    return this.casualDayService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update casual day request' })
  @ApiResponse({
    status: 200,
    description: 'Casual day request updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCasualDayDto,
  ): Promise<CasualDay> {
    return this.casualDayService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete casual day request' })
  @ApiResponse({
    status: 200,
    description: 'Casual day request deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Casual day not found' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    await this.casualDayService.remove(id);
    return { success: true };
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for casual day' })
  @ApiResponse({
    status: 200,
    description:
      'Return unique year-month combinations for casual day records',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.casualDayService.findArchiveMonths();
  }
}




