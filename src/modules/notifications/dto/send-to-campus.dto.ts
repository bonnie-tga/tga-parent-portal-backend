import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsMongoId, IsObject, IsIn, ValidateIf } from 'class-validator';

export class SendToCampusDto {
  @ApiProperty({ example: '650f1a2b3c4d5e6f7a8b9c0d', description: 'Target campus ObjectId' })
  @IsMongoId()
  campusId: string;

  @ApiProperty({ example: 'New Event Available', description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Check out our new event in your campus.', description: 'Notification body/message' })
  @IsString()
  body: string;

  @ApiProperty({ enum: ['created', 'updated', 'deleted'], required: false, default: 'created', description: 'Event type' })
  @IsOptional()
  @IsIn(['created', 'updated', 'deleted'])
  event?: 'created' | 'updated' | 'deleted';

  @ApiProperty({ enum: ['Announcement', 'Event', 'Poll', 'Survey'], required: false, description: 'Model name for dynamic population' })
  @IsOptional()
  @IsIn(['Announcement', 'Event', 'Poll', 'Survey'])
  refModel?: 'Announcement' | 'Event' | 'Poll' | 'Survey';

  @ApiProperty({ required: false, example: '650f1a2b3c4d5e6f7a8b9c0d', description: 'Related entity _id matching refModel (required when refModel provided)' })
  @ValidateIf(o => !!o.refModel)
  @IsMongoId()
  relatedEntityId?: string;

  @ApiProperty({ required: false, description: 'Additional metadata (e.g., url, deep-link params)', type: Object })
  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}
