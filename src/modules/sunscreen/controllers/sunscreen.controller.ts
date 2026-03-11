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
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../users/schemas/user.schema';
import { SunscreenService } from '../services/sunscreen.service';
import { CreateSunscreenDto } from '../dto/create-sunscreen.dto';
import { UpdateSunscreenDto } from '../dto/update-sunscreen.dto';
import { QuerySunscreenDto } from '../dto/query-sunscreen.dto';
import { Sunscreen } from '../schemas/sunscreen.schema';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';
// import { AutoFeed } from '../../auto-feed/auto-feed.decorator';

@ApiTags('sunscreen')
@Controller('sunscreen')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class SunscreenController {
  constructor(private readonly service: SunscreenService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new sunscreen record' })
  @ApiResponse({ status: 201, description: 'Record created successfully' })
  // @AutoFeed({ type: 'sunscreen', action: 'create' })
  create(@Body() dto: CreateSunscreenDto, @CurrentUser() user: User): Promise<Sunscreen> {
    return this.service.create(dto, String(user._id));
  }

  @Get()
  @ApiOperation({ summary: 'List sunscreen records with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Return paginated sunscreen records' })
  findAll(
    @Query() query: QuerySunscreenDto,
    @CurrentUser() user: User,
  ): Promise<PaginatedResultDto<Sunscreen>> {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sunscreen record by id' })
  @ApiResponse({ status: 200 })
  findOne(@Param('id') id: string, @CurrentUser() user: User): Promise<Sunscreen> {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sunscreen record' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  // @AutoFeed({ type: 'sunscreen', action: 'update' })
  update(@Param('id') id: string, @Body() dto: UpdateSunscreenDto, @CurrentUser() user: User): Promise<Sunscreen> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sunscreen record' })
  @ApiResponse({ status: 200, description: 'Record deleted successfully' })
  // @AutoFeed({ type: 'sunscreen', action: 'delete' })
  async remove(@Param('id') id: string, @CurrentUser() user: User): Promise<{ success: true }> {
    await this.service.remove(id, user);
    return { success: true };
  }
}


