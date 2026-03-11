import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import { MealTime, MenuRotation, MenuStatus } from '../schemas/menu.schema';

@ValidatorConstraint({ name: 'menuRotationWeeksMatch', async: false })
class MenuRotationWeeksMatchConstraint implements ValidatorConstraintInterface {
  validate(menus: MenuWeekDto[], args: ValidationArguments): boolean {
    const menuRotation = (args.object as CreateMenuDto).menuRotation;
    if (!menuRotation || !menus) {
      return true;
    }
    const expectedWeeks = this.getExpectedWeeks(menuRotation);
    return menus.length === expectedWeeks;
  }

  defaultMessage(args: ValidationArguments): string {
    const menuRotation = (args.object as CreateMenuDto).menuRotation;
    const menus = args.value as MenuWeekDto[];
    const expectedWeeks = this.getExpectedWeeks(menuRotation);
    return `Menu rotation '${menuRotation}' requires exactly ${expectedWeeks} week(s), but ${menus?.length || 0} week(s) provided`;
  }

  private getExpectedWeeks(menuRotation: MenuRotation): number {
    const mapping: Record<MenuRotation, number> = {
      [MenuRotation.ONE_WEEK_ONLY]: 1,
      [MenuRotation.TWO_WEEKS]: 2,
      [MenuRotation.THREE_WEEKS]: 3,
      [MenuRotation.FOUR_WEEKS]: 4,
      [MenuRotation.FIVE_WEEKS]: 5,
      [MenuRotation.SIX_WEEKS]: 6,
    };
    return mapping[menuRotation] || 0;
  }
}

// ✅ Weekdays DTO
export class WeekDaysDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  Monday?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  Tuesday?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  Wednesday?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  Thursday?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  Friday?: string;
}

// ✅ Individual meal DTO (Breakfast, Lunch, etc.)
export class MenuMealItemDto {
  @ApiProperty({ enum: MealTime })
  @IsEnum(MealTime)
  @IsNotEmpty()
  mealTime: MealTime;

  @ApiProperty({ type: WeekDaysDto })
  @ValidateNested()
  @Type(() => WeekDaysDto)
  @IsNotEmpty()
  weekDays: WeekDaysDto;
}

// ✅ Represents one menu week (order + menuItems)
export class MenuWeekDto {
  @ApiProperty({ description: 'Menu order within rotation (Menu 1..N)', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  order: number;

  @ApiProperty({ type: [MenuMealItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuMealItemDto)
  @IsNotEmpty()
  menuItems: MenuMealItemDto[];
}

// ✅ Main DTO for creation (multiple weeks per rotation)
export class CreateMenuDto {
  @ApiProperty({ description: 'Campus id' })
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @ApiProperty({ enum: MenuRotation })
  @IsEnum(MenuRotation)
  @IsNotEmpty()
  menuRotation: MenuRotation;

  @ApiProperty({ type: [MenuWeekDto], description: 'Menus (weeks) in this rotation' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuWeekDto)
  @IsNotEmpty()
  @Validate(MenuRotationWeeksMatchConstraint)
  menus: MenuWeekDto[];

  @ApiPropertyOptional({ enum: MenuStatus })
  @IsEnum(MenuStatus)
  @IsOptional()
  status?: MenuStatus;

  @ApiPropertyOptional({ description: 'Published at (ISO string)' })
  @IsDateString()
  @IsOptional()
  publishedAt?: string;
}
