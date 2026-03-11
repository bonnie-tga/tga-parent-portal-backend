import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfTemplateService {
  private readonly logger = new Logger(PdfTemplateService.name);

  /**
   * Convert HTML string to PDF
   * Accepts fully rendered HTML from frontend and converts it to PDF
   */
  async htmlToPdf(html: string, options?: {
    format?: 'LETTER' | 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    timeout?: number;
  }): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        timeout: options?.timeout || 30000,
      });

      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2, // Higher DPI for better quality
      });

      // Process HTML to handle relative image paths and ensure proper structure
      const processedHtml = this.processHtmlForPdf(html);
      
      // Set timeout for page content loading
      await page.setContent(processedHtml, { 
        waitUntil: 'networkidle0',
        timeout: options?.timeout || 30000,
      });

      // Wait for all images and fonts to load
      await page.evaluateHandle('document.fonts.ready');

      const pdf = await page.pdf({
        format: options?.format || 'LETTER',
        printBackground: true,
        margin: options?.margin || {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      });

      await browser.close();

      return Buffer.from(pdf);
    } catch (error) {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.error(`Error closing browser: ${closeError.message}`);
        }
      }
      this.logger.error(`Error converting HTML to PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process HTML to ensure proper PDF rendering
   * - Wraps content in proper HTML structure if needed
   * - Ensures CSS is properly included
   */
  private processHtmlForPdf(html: string): string {
    // Check if HTML already has <html> and <head> tags
    const hasHtmlTag = /<html[^>]*>/i.test(html);
    const hasHeadTag = /<head[^>]*>/i.test(html);
    const hasBodyTag = /<body[^>]*>/i.test(html);

    // If it's a complete HTML document, return as is
    if (hasHtmlTag && hasHeadTag && hasBodyTag) {
      return html;
    }

    // If it's just a fragment, wrap it properly
    let processed = html;

    // Add meta tags for proper rendering
    const metaTags = `
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    `;

    // Add print-specific CSS to ensure colors and backgrounds render
    const printCss = `
      <style>
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      </style>
    `;

    if (!hasHtmlTag) {
      processed = `<!DOCTYPE html>
<html lang="en">
<head>
  ${metaTags}
  ${printCss}
</head>
<body>
  ${processed}
</body>
</html>`;
    } else if (!hasHeadTag) {
      processed = processed.replace(
        /<html[^>]*>/i,
        `$&<head>${metaTags}${printCss}</head>`
      );
    } else if (!printCss.includes(processed)) {
      processed = processed.replace(
        /<\/head>/i,
        `${printCss}</head>`
      );
    }

    return processed;
  }
}
