import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import { MenuRotation, MenuStatus } from '../schemas/menu.schema';

export class QueryMenuDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Campus filter' })
  @IsMongoId()
  @IsOptional()
  campusId?: string;
  
  @ApiPropertyOptional({ enum: MenuStatus })
  @IsEnum(MenuStatus)
  @IsOptional()
  status?: MenuStatus;

  @ApiPropertyOptional({ enum: MenuRotation })
  @IsEnum(MenuRotation)
  @IsOptional()
  menuRotation?: MenuRotation;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ['createdAt', 'publishedAt', 'campus', 'author'] })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}


