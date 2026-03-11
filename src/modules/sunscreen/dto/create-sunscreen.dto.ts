import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SunscreenType, SunscreenTimeType } from '../schemas/sunscreen.schema';

export class CreateSunscreenTimeSlotDto {
  @ApiProperty({ example: SunscreenTimeType.ON_ARRIVAL })
  @IsEnum(SunscreenTimeType)
  @IsOptional()
  time?: SunscreenTimeType;

  @ApiProperty({ description: 'Staff id' })
  @IsMongoId()
  @IsOptional()
  staff?: string;

  @ApiPropertyOptional({ example: SunscreenType.SLEEP_REST })
  @IsEnum(SunscreenType)
  @IsOptional()
  value?: SunscreenType;

  @ApiPropertyOptional({ example: '7:30 AM' })
  @IsString()
  @IsOptional()
  doneTime?: string;
}

export class CreateSunscreenChildEntryDto {
  @ApiPropertyOptional({ description: 'Child id if known' })
  @IsMongoId()
  @IsOptional()
  children?: string[];

  @ApiPropertyOptional({ type: [CreateSunscreenTimeSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSunscreenTimeSlotDto)
  @IsOptional()
  slots?: CreateSunscreenTimeSlotDto[];
}

export class CreateSunscreenDto {
  @ApiProperty({ example: new Date('2025-10-09') })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Campus id' })
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @ApiProperty({ description: 'Top-level Staff id' })
  @IsMongoId()
  @IsNotEmpty()
  staff: string;

  @ApiPropertyOptional({ description: 'Room id' })
  @IsMongoId({ each: true })
  @IsOptional()
  rooms?: string[];

  @ApiPropertyOptional({ type: [CreateSunscreenChildEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSunscreenChildEntryDto)
  @IsOptional()
  sunscreenChildEntries?: CreateSunscreenChildEntryDto[];
}


