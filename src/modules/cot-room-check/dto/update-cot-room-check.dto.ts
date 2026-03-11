import { PartialType } from '@nestjs/swagger';
import { CreateCotRoomCheckDto } from './create-cot-room-check.dto';

export class UpdateCotRoomCheckDto extends PartialType(CreateCotRoomCheckDto) {}
