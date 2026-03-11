import { IsArray, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DailyChartStatus , DailyChartMeal, DailyChartVisibility, TeaLunch, FruitQuantity, WaterOptions, BottleAmount } from '../schemas/daily-chart.schema';


export enum DailyChartTimeSlot {
  morning = '8:30 AM',
  lunch = '11:00 AM',
  afternoon = '2:00 PM',
}

class BottleEntryDto {
  @IsArray()
  @IsEnum(BottleAmount, { each: true })
  @IsOptional()
  amount?: BottleAmount[];

  @IsString()
  @IsOptional()
  time?: string;
}

class ChildBottlesDto {
  @IsMongoId()
  @IsOptional()
  child?: string;

  @IsArray()
  @Type(() => BottleEntryDto)
  @IsOptional()
  @ValidateNested({ each: true })
  bottles?: BottleEntryDto[];
}
class DailyChartItemDto {
  @IsMongoId()
  @IsOptional()
  child?: string;

  @IsEnum(TeaLunch)
  @IsOptional()
  tea_lunch?: TeaLunch;

  @IsArray()
  @Type(() => BottleEntryDto)
  @IsOptional()
  @ValidateNested({ each: true })
  bottles?: BottleEntryDto[];

  @IsEnum(FruitQuantity)
  @IsOptional()
  fruit_quantity?: FruitQuantity;

  @IsEnum(WaterOptions)
  @IsOptional()
  water_options?: WaterOptions;

  @IsString()
  @IsOptional()
  comments?: string;
}

class DailyChartCategoryItemsDto {
  @IsArray()
  @Type(() => DailyChartItemDto)
  @IsOptional()
  @ValidateNested({ each: true })
  morning_tea?: DailyChartItemDto[];

  @IsArray()
  @Type(() => DailyChartItemDto)
  @IsOptional()
  @ValidateNested({ each: true })
  lunch?: DailyChartItemDto[];

  @IsArray()
  @Type(() => DailyChartItemDto)
  @IsOptional()
  @ValidateNested({ each: true })
  afternoon_tea?: DailyChartItemDto[];

  @IsArray()
  @Type(() => DailyChartItemDto)
  @IsOptional()
  @ValidateNested({ each: true })
  crunch_and_sip?: DailyChartItemDto[];
}

export class CreateDailyChartDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @IsMongoId()
  @IsNotEmpty()
  room: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  children: string[];

  @IsString()
  @IsOptional()
  morningTea?: string;

  @IsString()
  @IsOptional()
  lunch?: string;

  @IsString()
  @IsOptional()
  afternoonTea?: string;

  @IsEnum(DailyChartMeal)
  @IsOptional()
  category?: DailyChartMeal;

  @IsArray()
  @Type(() => ChildBottlesDto)
  @IsOptional()
  @ValidateNested({ each: true })
  childrenBottles?: ChildBottlesDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DailyChartCategoryItemsDto)
  dailyChartItems?: DailyChartCategoryItemsDto;

  @IsEnum(DailyChartStatus)
  @IsOptional()
  status?: DailyChartStatus;

  @IsEnum(DailyChartTimeSlot)
  @IsOptional()
  time?: DailyChartTimeSlot;

  @IsDateString()
  @IsOptional()
  scheduleAt?: string;

  @IsEnum(DailyChartVisibility)
  @IsOptional()
  visibility?: DailyChartVisibility;
}


