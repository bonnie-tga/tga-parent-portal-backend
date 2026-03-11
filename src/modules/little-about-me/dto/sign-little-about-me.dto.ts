import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StaffSignatureDto, ParentSignatureDto } from './create-little-about-me.dto';

export class SignLittleAboutMeDto {
  @ApiPropertyOptional({ type: StaffSignatureDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffSignatureDto)
  signedStaff?: StaffSignatureDto;

  @ApiPropertyOptional({ type: ParentSignatureDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParentSignatureDto)
  signedParent?: ParentSignatureDto;
}
