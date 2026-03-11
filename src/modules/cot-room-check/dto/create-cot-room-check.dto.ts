import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CotRoomCheckStatus } from '../schemas/cot-room-check.schema';
import { Type } from 'class-transformer';


export class CreateCotRoomCheckOptionDto {
  @IsEnum(CotRoomCheckStatus)
  @IsOptional()
  status?: CotRoomCheckStatus;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  value?: string;
}

export class CreateCotRoomCheckDto {
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @IsMongoId()
  @IsNotEmpty()
  room: string;

  @IsMongoId()
  @IsNotEmpty()
  staff: string;

  @IsMongoId()
  @IsNotEmpty()
  cotRoom: string;

  @IsDateString()
  @IsOptional()
  time?: string;

  @IsDateString()
  @IsOptional()
  date?: string;
  

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCotRoomCheckOptionDto)
  @IsOptional()
  cotRoomCheckOptions?: CreateCotRoomCheckOptionDto[];

  @IsBoolean()
  @IsOptional()
  reChecked?: boolean;
}
