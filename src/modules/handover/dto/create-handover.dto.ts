import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { HandoverStatus } from '../schemas/handover.schema';

export class CreateHandoverDto {
  @ApiProperty({ description: 'Campus id' })
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @ApiProperty({ description: 'Room id' })
  @IsMongoId()
  @IsOptional()
  room?: string;

  @ApiProperty({ description: 'Child id' })
  @IsMongoId()
  @IsNotEmpty()
  child: string;

  @ApiProperty({ description: 'Photos' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @ApiProperty({ description: 'Wake up time' })
  @IsString()
  @IsOptional()
  wakeUpTime?: string;

  @ApiProperty({ description: 'Breakfast time' })
  @IsString()
  @IsOptional()
  breakfastTime?: string;

  @ApiProperty({ description: 'What was eaten' })
  @IsString()
  @IsOptional()
  whatWasEaten?: string;

  @ApiProperty({ description: 'Last time of bottle feed' })
  @IsString()
  @IsOptional()
  lastTimeOfBottleFeed?: string;

  @ApiProperty({ description: 'Last time of bottle detail' })
  @IsString()
  @IsOptional()
  lastTimeOfBottleDetail?: string;

  @ApiProperty({ description: 'Last nappy change time' })
  @IsString()
  @IsOptional()
  lastNappyChangeTime?: string;

  @ApiProperty({ description: 'Last nappy change detail' })
  @IsString()
  @IsOptional()
  lastNappyChangeDetail?: string;

  @ApiProperty({ description: 'Special instructions for the day' })
  @IsString()
  @IsOptional()
  specialInstructionsForTheDay?: string;

  @ApiProperty({ description: 'Emotional need' })
  @IsString()
  @IsOptional()
  emotionalNeed?: string;

  @ApiProperty({ description: 'Behaviour' })
  @IsString()
  @IsOptional()
  behaviour?: string;

  @ApiProperty({ description: 'Rest time' })
  @IsString()
  @IsOptional()
  restTime?: string;

  @ApiProperty({ description: 'Any change in routine' })
  @IsString()
  @IsOptional()
  anyChangeInRoutine?: string;

  @ApiProperty({ description: 'Additional comments' })
  @IsString()
  @IsOptional()
  additionalComments?: string;

  @ApiProperty({ description: 'Status' })
  @IsEnum(HandoverStatus)
  @IsOptional()
  status?: HandoverStatus;

  @ApiProperty({ description: 'Published at' })
  @IsDateString()
  @IsOptional()
  publishedAt?: string;
}


