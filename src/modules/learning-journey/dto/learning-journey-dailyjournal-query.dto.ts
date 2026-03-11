import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

type LearningJourneyQueryMonth = number;

type LearningJourneyQueryYear = number;

export class LearningJourneyDailyJournalQueryDto {
  @ApiPropertyOptional({
    description:
      'Month 1 (1-12). Example: September = 9. Defines the start of the inclusive month range.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  monthOne?: LearningJourneyQueryMonth;

  @ApiPropertyOptional({
    description:
      'Month 2 (1-12). Example: October = 10. Defines the end of the inclusive month range.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  monthTwo?: LearningJourneyQueryMonth;

  @ApiPropertyOptional({
    description:
      'Calendar year used with Month 1 and Month 2. If omitted, the current year is used.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: LearningJourneyQueryYear;

  @ApiPropertyOptional({ description: 'Campus identifier' })
  @IsOptional()
  @IsMongoId()
  campus?: string;

  @ApiPropertyOptional({ description: 'Room identifier' })
  @IsOptional()
  @IsMongoId()
  room?: string;

  @ApiPropertyOptional({
    description:
      'Child identifier. When provided, only Individual Learning items where this child is tagged are returned.',
  })
  @IsMongoId()
  children?: string;
}


