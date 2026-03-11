import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StaffService } from '../services/staff.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('staff')
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}


  @Get()
  @ApiOperation({ summary: 'Get all staff users' })
  @ApiResponse({ status: 200, description: 'Return all staff users' })
  findAll(@CurrentUser() currentUser: User) {
    return this.staffService.findAll(currentUser);
  }



  @Get('by-campus/:campusId')
  @ApiOperation({ summary: 'Get staff users by campus ID' })
  @ApiResponse({ status: 200, description: 'Return staff users for the specified campus' })
  findByCampus(@Param('campusId') campusId: string, @CurrentUser() currentUser: User) {
    return this.staffService.findByCampus(campusId, currentUser);
  }

  @Get('by-room/:roomId')
  @ApiOperation({ summary: 'Get staff users by room ID' })
  @ApiResponse({ status: 200, description: 'Return staff users for the specified room' })
  findByRoom(@Param('roomId') roomId: string, @CurrentUser() currentUser: User) {
    return this.staffService.findByRoom(roomId, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a staff user by ID' })
  @ApiResponse({ status: 200, description: 'Return the staff user' })
  findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.staffService.findOne(id, currentUser);
  }

}
