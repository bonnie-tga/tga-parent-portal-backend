import { IsString, IsMongoId, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoomStatus } from '../schemas/room.schema';

export class UpdateRoomDto {
  @ApiPropertyOptional({
    example: 'Koala Room',
    description: 'Name of the room',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109ca',
    description: 'Campus ID that this room belongs to',
  })
  @IsMongoId()
  @IsOptional()
  campus?: string;

  @ApiPropertyOptional({
    enum: ['Infant', 'Not Infant', 'Toddler', 'Preschool', 'Kindergarten'],
    description: 'Category of the room',
  })
  @IsEnum(['Infant', 'Not Infant', 'Toddler', 'Preschool', 'Kindergarten'])
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    enum: ['0-2', '2-3', '3-5'],
    description: 'Age group for the room',
  })
  @IsEnum(['0-2', '2-3', '3-5'])
  @IsOptional()
  age?: string;

  @ApiPropertyOptional({
    enum: ['Indoor', 'Outdoor', 'Common Area'],
    description: 'Type of the room',
  })
  @IsEnum(['Indoor', 'Outdoor', 'Common Area'])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether to display the room on frontend',
  })
  @IsBoolean()
  @IsOptional()
  displayOnFrontend?: boolean;

  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109cb',
    description: 'User ID of the creator',
  })
  @IsMongoId()
  @IsOptional()
  createdBy?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the room is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
  
  @ApiPropertyOptional({
    enum: Object.values(RoomStatus),
    description: 'Status of the room',
  })
  @IsEnum(Object.values(RoomStatus))
  @IsOptional()
  status?: string;
}
