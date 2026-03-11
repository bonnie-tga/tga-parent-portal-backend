import { PartialType } from '@nestjs/swagger';
import { CreatePhotosDto } from './create-photos.dto';

export class UpdatePhotosDto extends PartialType(CreatePhotosDto) {}
