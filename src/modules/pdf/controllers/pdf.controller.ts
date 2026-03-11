import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { PdfService } from '../services/pdf.service';
import { GenerateOutdoorLearningPdfDto } from '../dto/generate-outdoor-learning-pdf.dto';
import { GenerateGroveCurriculumPdfDto } from '../dto/generate-grove-curriculum-pdf.dto';

@ApiTags('pdf')
@Controller('pdf')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('outdoor-learning')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Outdoor Learning PDF',
    description: 'Generates a PDF document for outdoor learning activities based on month, year, campus, and room from grove curriculum data.',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Grove curriculum data not found' })
  async generateOutdoorLearningPdf(
    @Query() queryParams: GenerateOutdoorLearningPdfDto,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, campusName, roomName } = await this.pdfService.generateOutdoorLearningPdf(queryParams);
    const fileName = this.pdfService.generateFileName(campusName, roomName, queryParams.month, queryParams.year);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdf);
  }

  @Get('grove-curriculum')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Grove Curriculum PDF',
    description: 'Generates a PDF document for grove curriculum (Environment, Spontaneous Learning, Where To Next, School Readiness) based on month, year, campus, and room.',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Grove curriculum data not found' })
  async generateGroveCurriculumPdf(
    @Query() queryParams: GenerateGroveCurriculumPdfDto,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, campusName, roomName } = await this.pdfService.generateGroveCurriculumPdf(queryParams);
    const fileName = this.pdfService.generateFileName(campusName, roomName, queryParams.month, queryParams.year);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdf);
  }

  @Get('grove-curriculum-family')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Grove Curriculum PDF (Family)',
    description:
      'Generates a PDF document for grove curriculum (Environment, Spontaneous Learning, Outdoor Learning) for family users based on month, year, campus, and room.',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Grove curriculum data not found' })
  async generateGroveCurriculumFamilyPdf(
    @Query() queryParams: GenerateGroveCurriculumPdfDto,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, campusName, roomName } = await this.pdfService.generateGroveCurriculumFamilyPdf(queryParams);
    const fileName = this.pdfService.generateFileName(campusName, roomName, queryParams.month, queryParams.year);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdf);
  }
}

