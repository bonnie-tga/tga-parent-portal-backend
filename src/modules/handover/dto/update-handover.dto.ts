import { PartialType } from '@nestjs/swagger';
import { CreateHandoverDto } from './create-handover.dto';

export class UpdateHandoverDto extends PartialType(CreateHandoverDto) {}


