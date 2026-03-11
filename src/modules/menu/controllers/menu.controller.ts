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
import { MenuService } from '../services/menu.service';
import { CreateMenuDto } from '../dto/create-menu.dto';
import { UpdateMenuDto } from '../dto/update-menu.dto';
import { QueryMenuDto } from '../dto/query-menu.dto';
import { Menu } from '../schemas/menu.schema';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';
// import { AutoFeed } from '../../auto-feed/auto-feed.decorator';

@ApiTags('menu')
@Controller('menu')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class MenuController {
  constructor(private readonly service: MenuService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new menu record' })
  @ApiResponse({ status: 201, description: 'Record created successfully' })
  // @AutoFeed({ type: 'menu', action: 'create' })
  create(@Body() dto: CreateMenuDto, @CurrentUser() user: User): Promise<Menu> {
    return this.service.create(dto, String(user._id), user);
  }

  @Get()
  @ApiOperation({ summary: 'List menu records with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Return paginated menu records' })
  findAll(
    @Query() query: QueryMenuDto,
    @CurrentUser() user: User,
  ): Promise<PaginatedResultDto<Menu>> {
    return this.service.findAll(query, user);
  }

  @Get('today/:campusId')
  @ApiOperation({ summary: 'Get today\'s menu for a campus' })
  @ApiResponse({ status: 200, description: 'Returns today\'s menu items' })
  async getTodayMenu(
    @Param('campusId') campusId: string,
    @CurrentUser() user: User,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : undefined;
    return this.service.getTodayMenu(campusId, user, targetDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a menu record by id' })
  @ApiResponse({ status: 200 })
  findOne(@Param('id') id: string, @CurrentUser() user: User): Promise<Menu> {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a menu record' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  // @AutoFeed({ type: 'menu', action: 'update' })
  update(@Param('id') id: string, @Body() dto: UpdateMenuDto, @CurrentUser() user: User): Promise<Menu> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a menu record' })
  @ApiResponse({ status: 200, description: 'Record deleted successfully' })
  // @AutoFeed({ type: 'menu', action: 'delete' })
  async remove(@Param('id') id: string, @CurrentUser() user: User): Promise<{ success: true }> {
    await this.service.remove(id, user);
    return { success: true };
  }
}


