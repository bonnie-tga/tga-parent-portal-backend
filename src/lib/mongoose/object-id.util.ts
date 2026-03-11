import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

export const toObjectId = (value: unknown): Types.ObjectId | undefined => {
  if (value == null) {
    return undefined;
  }
  if (value instanceof Types.ObjectId) {
    return value;
  }
  if (typeof value === 'string') {
    return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : undefined;
  }
  if (typeof value === 'object') {
    const nested = (value as Record<string, unknown>)._id;
    if (nested) {
      return toObjectId(nested);
    }
  }
  return undefined;
};

export const requireObjectId = (value: unknown, field: string): Types.ObjectId => {
  const objectId = toObjectId(value);
  if (!objectId) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return objectId;
};

export const toObjectIdArray = (values: unknown[], field: string): Types.ObjectId[] =>
  values.map((value) => requireObjectId(value, field));
