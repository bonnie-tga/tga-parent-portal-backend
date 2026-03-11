import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsDateString,
    IsInt,
    IsMongoId,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class QueryLittleAboutMeDto {
    @ApiPropertyOptional({
        description: 'Year and month of the story in ISO format (YYYY-MM), based on publishedAt',
    })
    @IsOptional()
    @IsDateString()
    date?: string;

    @ApiPropertyOptional({ description: 'Campus identifier' })
    @IsOptional()
    @IsMongoId()
    campus?: string;

    @ApiPropertyOptional({ description: 'Room identifier' })
    @IsOptional()
    @IsMongoId()
    room?: string;

    @ApiPropertyOptional({ description: 'Child identifier' })
    @IsOptional()
    @IsMongoId()
    child?: string;

    @ApiPropertyOptional({ description: 'Parent identifier' })
    @IsOptional()
    @IsMongoId()
    parent?: string;

    @ApiPropertyOptional({ description: 'Status of the form' })
    @IsOptional()
    @IsString()
    status?: string;

  @ApiPropertyOptional({ description: 'Free text search by child or form name' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Page number (1-based)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ description: 'Page size' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;
}