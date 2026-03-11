import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImmunisationReminderService } from '../services/immunisation-reminder.service';
import { CreateImmunisationReminderDto } from '../dto/create-immunisation-reminder.dto';
import { UpdateParentResponseDto } from '../dto/update-parent-response.dto';
import { QueryImmunisationReminderDto } from '../dto/query-immunisation-reminder.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../users/schemas/user.schema';

@ApiTags('Immunisation Reminders')
@Controller('immunisation-reminders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImmunisationReminderController {
  constructor(
    private readonly immunisationReminderService: ImmunisationReminderService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create immunisation reminder (Admin only)' })
  async create(@Body() createDto: CreateImmunisationReminderDto) {
    return this.immunisationReminderService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all immunisation reminders' })
  async findAll(@Query() queryDto: QueryImmunisationReminderDto) {
    return this.immunisationReminderService.findAll(queryDto);
  }

  @Get('child/:childId')
  @ApiOperation({ summary: 'Get immunisation reminders for a specific child' })
  async findByChild(
    @Param('childId') childId: string,
    @Request() req: { user: User },
  ) {
    return this.immunisationReminderService.findByChild(childId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single immunisation reminder by ID' })
  async findOne(@Param('id') id: string) {
    return this.immunisationReminderService.findOne(id);
  }

  @Put('response')
  @ApiOperation({ summary: 'Update parent response to reminder' })
  async updateParentResponse(
    @Body() updateDto: UpdateParentResponseDto,
    @Request() req: { user: User },
  ) {
    return this.immunisationReminderService.updateParentResponse(
      updateDto,
      req.user._id.toString(),
    );
  }

  @Post('check-reminders')
  @ApiOperation({
    summary: 'Manually trigger reminder check (Admin only)',
    description:
      'This endpoint manually triggers the check for creating reminders. Normally this runs automatically via scheduled job.',
  })
  async checkReminders() {
    await this.immunisationReminderService.checkAndCreateReminders();
    return { message: 'Reminder check completed' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete immunisation reminder (Admin only, for testing)' })
  async delete(@Param('id') id: string) {
    await this.immunisationReminderService.delete(id);
    return { message: 'Reminder deleted successfully' };
  }
}
