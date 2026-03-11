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
import { WellnessPlanService } from '../services/wellness-plan.service';
import { CreateWellnessPlanDto } from '../dto/create-wellness-plan.dto';
import { UpdateWellnessPlanDto } from '../dto/update-wellness-plan.dto';
import { QueryWellnessPlanDto } from '../dto/query-wellness-plan.dto';
import { WellnessPlan } from '../schemas/wellness-plan.schema';

@ApiTags('wellness-plan')
@Controller('wellness-plan')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class WellnessPlanController {
  constructor(private readonly wellnessPlanService: WellnessPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wellness plan' })
  @ApiResponse({ status: 201, description: 'Wellness plan created successfully' })
  create(
    @Body() dto: CreateWellnessPlanDto,
    @CurrentUser() currentUser: User,
  ): Promise<WellnessPlan> {
    return this.wellnessPlanService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all wellness plans' })
  @ApiResponse({ status: 200, description: 'Return all wellness plans' })
  findAll(@Query() query: QueryWellnessPlanDto): Promise<WellnessPlan[]> {
    return this.wellnessPlanService.findAll(query);
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for wellness plans' })
  @ApiResponse({
    status: 200,
    description: 'Return unique year-month combinations for wellness plans',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.wellnessPlanService.findArchiveMonths();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a wellness plan by ID' })
  @ApiResponse({ status: 200, description: 'Return the wellness plan' })
  @ApiResponse({ status: 404, description: 'Wellness plan not found' })
  findOne(@Param('id') id: string): Promise<WellnessPlan> {
    return this.wellnessPlanService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a wellness plan' })
  @ApiResponse({ status: 200, description: 'Wellness plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Wellness plan not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWellnessPlanDto,
    @CurrentUser() currentUser: User,
  ): Promise<WellnessPlan> {
    return this.wellnessPlanService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a wellness plan' })
  @ApiResponse({ status: 200, description: 'Wellness plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Wellness plan not found' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.wellnessPlanService.remove(id);
    return { success: true };
  }
}


