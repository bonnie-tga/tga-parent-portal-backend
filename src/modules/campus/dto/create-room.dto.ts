import { IsNotEmpty, IsString, IsMongoId, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomStatus } from '../schemas/room.schema';

export class CreateRoomDto {
  @ApiProperty({
    example: 'Koala Room',
    description: 'Name of the room',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '60d0fe4f5311236168a109ca',
    description: 'Campus ID that this room belongs to',
  })
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

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
    default: false,
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
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
  
  @ApiPropertyOptional({
    enum: Object.values(RoomStatus),
    description: 'Status of the room',
    default: RoomStatus.DRAFT,
  })
  @IsEnum(Object.values(RoomStatus))
  @IsOptional()
  status?: string;
}
