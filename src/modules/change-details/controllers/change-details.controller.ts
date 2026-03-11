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
import { ChangeDetailsService } from '../services/change-details.service';
import { CreateChangeDetailsDto } from '../dto/create-change-details.dto';
import { UpdateChangeDetailsDto } from '../dto/update-change-details.dto';
import { QueryChangeDetailsDto } from '../dto/query-change-details.dto';
import { ChangeDetails } from '../schemas/change-details.schema';

@ApiTags('change-details')
@Controller('change-details')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class ChangeDetailsController {
  constructor(
    private readonly changeDetailsService: ChangeDetailsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a change of details request' })
  @ApiResponse({
    status: 201,
    description: 'Change of details request created successfully',
  })
  create(
    @Body() dto: CreateChangeDetailsDto,
    @CurrentUser() currentUser: User,
  ): Promise<ChangeDetails> {
    return this.changeDetailsService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get change of details requests' })
  @ApiResponse({
    status: 200,
    description: 'Return change of details requests',
  })
  findAll(
    @Query() query: QueryChangeDetailsDto,
  ): Promise<ChangeDetails[]> {
    return this.changeDetailsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get change of details request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return change of details request',
  })
  findOne(
    @Param('id') id: string,
  ): Promise<ChangeDetails> {
    return this.changeDetailsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update change of details request' })
  @ApiResponse({
    status: 200,
    description: 'Change of details request updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChangeDetailsDto,
  ): Promise<ChangeDetails> {
    return this.changeDetailsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete change of details request' })
  @ApiResponse({
    status: 200,
    description: 'Change of details request deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Change of details not found' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    await this.changeDetailsService.remove(id);
    return { success: true };
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for change of details' })
  @ApiResponse({
    status: 200,
    description:
      'Return unique year-month combinations for change of details records',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.changeDetailsService.findArchiveMonths();
  }
}


