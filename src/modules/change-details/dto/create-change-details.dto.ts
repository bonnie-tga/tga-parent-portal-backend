import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import {
  ChangeDetailsEmergencyAction,
  ChangeDetailsEmergencyType,
} from '../schemas/change-details.schema';

export class EmergencyContactDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  relationship?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Children identifiers',
  })
  @IsMongoId({ each: true })
  @IsOptional()
  children?: string[];

  @ApiPropertyOptional({ enum: ChangeDetailsEmergencyType })
  @IsEnum(ChangeDetailsEmergencyType)
  @IsOptional()
  emergencyType?: ChangeDetailsEmergencyType;

  @ApiPropertyOptional({ enum: ChangeDetailsEmergencyAction })
  @IsEnum(ChangeDetailsEmergencyAction)
  @IsOptional()
  emergencyAction?: ChangeDetailsEmergencyAction;
}

export class CreateChangeDetailsDto {
  @ApiProperty()
  @IsMongoId()
  campusId!: string;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  roomId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  newAddress?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  newPhoneNumber?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  addOrRemoveEmergencyContact?: boolean;

  @ApiPropertyOptional({ type: EmergencyContactDto })
  @IsOptional()
  emergencyContact?: EmergencyContactDto;

  @ApiPropertyOptional({ type: EmergencyContactDto })
  @IsOptional()
  additionalEmergencyContact?: EmergencyContactDto;
}


