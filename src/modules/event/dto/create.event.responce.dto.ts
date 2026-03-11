import { ResponseStatus } from "../schema/event-responce.schema";
import { IsEnum, IsInt, IsMongoId, IsNotEmpty, IsOptional, Min, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from "@nestjs/swagger";



export class UpsertEventResponseDto {
    @ApiProperty({ description: 'Event ID' })
    @IsMongoId()
    @IsNotEmpty()
    eventId: string;

    @ApiProperty({ description: 'Parent ID' })
    @IsMongoId()
    @IsNotEmpty()
    parentId: string;

    @ApiProperty({ description: 'Status' })
    @IsEnum(ResponseStatus)
    status: ResponseStatus;

    @ApiProperty({ description: 'Quantity' })
    @IsInt()
    @IsOptional()
    quantity?: number;
}