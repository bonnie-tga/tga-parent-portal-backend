import { PartialType } from '@nestjs/swagger';
import { CreateCotRoomDto } from './create-cot-room.dto';

export class UpdateCotRoomDto extends PartialType(CreateCotRoomDto) {}
