import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';
import { BEARER_AUTH_NAME, BASIC_AUTH_NAME } from '../../../config/swagger.config';

/**
 * Custom decorator that applies both Bearer and Basic auth security schemes
 * This ensures all controllers use the same authorization schemes
 */
export function ApiSecurityAuth() {
  return applyDecorators(
    ApiBearerAuth(BEARER_AUTH_NAME),
    ApiBasicAuth(BASIC_AUTH_NAME),
  );
}
