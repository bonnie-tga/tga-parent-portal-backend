import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ValidationError,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Default error message
    let message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';
    
    // Extract validation errors if present
    let validationErrors = null;
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      
      // Check if this is a validation error (typically from ValidationPipe)
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null 
      ) {
        if (exceptionResponse['message'] && Array.isArray(exceptionResponse['message'])) {
          // Extract validation error messages
          validationErrors = exceptionResponse['message'];
          message = 'Validation failed';
        } else if (exceptionResponse['message']) {
          message = exceptionResponse['message'];
        }
      }
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message,
      ...(validationErrors && { errors: validationErrors }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception.stack,
      }),
    };

    // Log detailed information about the request that caused the error
    if (request.body) {
      // Exclude sensitive data like passwords
      const sanitizedBody = { ...request.body };
      if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
      if (sanitizedBody.confirmPassword) sanitizedBody.confirmPassword = '[REDACTED]';
      
      this.logger.error(`${request.method} ${request.url}`, {
        body: sanitizedBody,
        error: errorResponse
      });
    } else {
      this.logger.error(`${request.method} ${request.url}`, errorResponse);
    }

    response.status(status).json(errorResponse);
  }
}
