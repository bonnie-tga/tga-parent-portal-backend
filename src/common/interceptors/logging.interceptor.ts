import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, body, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          const responseTime = Date.now() - startTime;
          this.logger.log(
            `[${method}] ${url} ${response.statusCode} ${responseTime}ms - ${ip} - ${userAgent}`,
            {
              method,
              url,
              statusCode: response.statusCode,
              responseTime,
              ip,
              userAgent,
              requestBody: this.sanitizeBody(body),
              responseData: this.sanitizeBody(data),
            },
          );
        },
        error: (error: any) => {
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `[${method}] ${url} ${error.status || 500} ${responseTime}ms - ${ip} - ${userAgent}`,
            {
              method,
              url,
              statusCode: error.status || 500,
              responseTime,
              ip,
              userAgent,
              requestBody: this.sanitizeBody(body),
              error: {
                message: error.message,
                stack: error.stack,
              },
            },
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'refreshToken', 'currentPassword', 'newPassword'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) sanitized[field] = '[REDACTED]';
    });
    return sanitized;
  }
}
