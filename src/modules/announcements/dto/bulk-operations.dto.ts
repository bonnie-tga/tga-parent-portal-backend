import { IsArray, IsEnum, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BulkAction {
  DELETE = 'delete',
  PUBLISH = 'publish',
  UNPUBLISH = 'unpublish',
  MOVE_TO_TRASH = 'move_to_trash',
  RESTORE_FROM_TRASH = 'restore_from_trash',
  PIN = 'pin',
  UNPIN = 'unpin',
}

export class BulkActionDto {
  @ApiProperty({
    type: [String],
    description: 'Array of announcement IDs to perform bulk action on',
    example: ['60d0fe4f5311236168a109ca', '60d0fe4f5311236168a109cb'],
  })
  @IsArray()
  @IsMongoId({ each: true })
  ids: string[];

  @ApiProperty({
    enum: BulkAction,
    description: 'The bulk action to perform',
    example: BulkAction.DELETE,
  })
  @IsEnum(BulkAction)
  action: BulkAction;
}

