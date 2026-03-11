import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventResponseService } from '../service/event-responce.service';
import { UpsertEventResponseDto } from '../dto/create.event.responce.dto';

@ApiTags('event-responses')
@Controller('event-responses')
export class EventResponseController {
  constructor(private readonly eventResponseService: EventResponseService) { }

  @ApiOperation({ summary: 'Create or update a parent\'s response for an event' })
  @Post()
  async upsert(@Body() body: UpsertEventResponseDto) {
    return this.eventResponseService.create(body);
  }
  @ApiOperation({ summary: 'Update an existing response for an event by eventId and parentId' })
  @Put(':eventId/:parentId')
  async update(
    @Param('eventId') eventId: string,
    @Param('parentId') parentId: string,
    @Body() body: Partial<UpsertEventResponseDto>,
  ) {
    return this.eventResponseService.update({
      eventId,
      parentId,
      status: body.status!,
      quantity: body.quantity,
    });
  }



  @ApiOperation({ summary: 'Check if a parent has already responded to an event' })
  @Get(':eventId/check/:parentId')
  async checkIfResponded(
    @Param('eventId') eventId: string,
    @Param('parentId') parentId: string,
  ): Promise<{ hasResponded: boolean; response?: any }> {
    return this.eventResponseService.checkIfResponded(eventId, parentId);
  }

  @ApiOperation({ summary: 'Get totals for an event' })
  @Get(':eventId/totals')
  async getTotals(@Param('eventId') eventId: string) {
    return this.eventResponseService.getTotals(eventId);
  }

  @ApiOperation({ summary: 'Get a single event response by its ID' })
  @Get('by-id/:id')
  async getById(@Param('id') id: string) {
    return this.eventResponseService.findById(id);
  }

  @ApiOperation({ summary: 'Get event response summary: totals and populated responses' })
  @Get(':eventId')
  async listByEvent(@Param('eventId') eventId: string) {
    return this.eventResponseService.getSummary(eventId);
  }

}


