export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  userId?: string;
  metadata?: any;
}
