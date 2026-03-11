import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NappyCategory } from '../schemas/nappy-change.schema';

export class CreateNappyTimeSlotDto {
  @ApiProperty({ example: '7:30 AM' })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiProperty({ type: [String], enum: NappyCategory })
  @IsArray()
  @IsEnum(NappyCategory, { each: true })
  @IsOptional()
  categories?: NappyCategory[];

  @ApiProperty({ description: 'Staff id' })
  @IsMongoId()
  @IsOptional()
  staff?: string;

  @ApiPropertyOptional({ example: '7:30 AM' })
  @IsString()
  @IsOptional()
  doneTime?: string;
}

export class CreateNappyChildEntryDto {
  @ApiPropertyOptional({ description: 'Child id if known' })
  @IsMongoId()
  @IsOptional()
  child?: string;

  @ApiProperty({ type: [CreateNappyTimeSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNappyTimeSlotDto)
  @IsOptional()
  slots?: CreateNappyTimeSlotDto[];

  @ApiPropertyOptional({ description: 'Special requirements for the child' })
  @IsString()
  @IsOptional()
  specialRequirements?: string;
}

export class CreateNappyChangeDto {
  @ApiProperty({ example: '2025-10-09' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Campus id' })
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @ApiPropertyOptional({ description: 'Room id' })
  @IsMongoId()
  @IsNotEmpty()
  room: string;

  @ApiProperty({ type: [CreateNappyChildEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNappyChildEntryDto)
  @IsOptional()
  nappyChildEntries?: CreateNappyChildEntryDto[];
}


