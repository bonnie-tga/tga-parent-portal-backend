import { PartialType } from '@nestjs/swagger';
import { CreateBreakfastDto } from './create-breakfast.dto';

export class UpdateBreakfastDto extends PartialType(CreateBreakfastDto) {}
