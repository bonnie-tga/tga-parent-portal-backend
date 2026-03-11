import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class HtmlSanitizerService {
  private readonly MAX_HTML_SIZE = 1024 * 1024; // 1MB

  /**
   * Validate and sanitize HTML content
   */
  validateAndSanitize(html: string): string {
    // Check size limit
    const htmlSize = Buffer.byteLength(html, 'utf8');
    if (htmlSize > this.MAX_HTML_SIZE) {
      throw new BadRequestException(
        `HTML content exceeds maximum size of ${this.MAX_HTML_SIZE / 1024 / 1024}MB`,
      );
    }

    // Remove inline JavaScript
    let sanitized = this.removeInlineJavaScript(html);

    // Remove script tags
    sanitized = this.removeScriptTags(sanitized);

    // Remove event handlers
    sanitized = this.removeEventHandlers(sanitized);

    // Remove javascript: protocol
    sanitized = this.removeJavascriptProtocol(sanitized);

    return sanitized;
  }

  /**
   * Remove inline JavaScript (onclick, onerror, etc.)
   * Preserves style attributes and other safe attributes
   */
  private removeInlineJavaScript(html: string): string {
    // Remove event handlers like onclick, onerror, onload, etc.
    // But preserve style, class, id, src, alt, width, height, etc.
    const eventHandlerPattern = /\s*on\w+\s*=\s*["'][^"']*["']/gi;
    return html.replace(eventHandlerPattern, '');
  }

  /**
   * Remove script tags and their content
   */
  private removeScriptTags(html: string): string {
    const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    return html.replace(scriptPattern, '');
  }

  /**
   * Remove event handlers from HTML attributes
   */
  private removeEventHandlers(html: string): string {
    // Remove common event handlers
    const handlers = [
      'onclick',
      'onerror',
      'onload',
      'onmouseover',
      'onmouseout',
      'onfocus',
      'onblur',
      'onchange',
      'onsubmit',
      'onkeydown',
      'onkeyup',
      'onkeypress',
    ];

    let sanitized = html;
    handlers.forEach((handler) => {
      const regex = new RegExp(`\\s*${handler}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized;
  }

  /**
   * Remove javascript: protocol from href and src attributes
   */
  private removeJavascriptProtocol(html: string): string {
    return html.replace(/javascript:/gi, '');
  }

  /**
   * Get maximum allowed HTML size
   */
  getMaxSize(): number {
    return this.MAX_HTML_SIZE;
  }
}

