import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GroveCurriculumService } from '../../grove-curriculum/services/grove-curriculum.service';
import { GenerateOutdoorLearningPdfDto } from '../dto/generate-outdoor-learning-pdf.dto';
import { GetGroveCurriculumDto } from '../../grove-curriculum/dto/get-grove-curriculum.dto';
import { GroveCurriculum } from '../../grove-curriculum/schemas/grove-curriculum.schema';
import { Campus } from '../../campus/schemas/campus.schema';
import { Room } from '../../campus/schemas/room.schema';
import * as ejs from 'ejs';
import * as puppeteer from 'puppeteer';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { GenerateGroveCurriculumPdfDto } from '../dto/generate-grove-curriculum-pdf.dto';

const A4_LANDSCAPE_VIEWPORT_WIDTH = 1123;
const A4_LANDSCAPE_VIEWPORT_HEIGHT = 794;

interface GroveEntry {
  id: string;
  room?: string;
  date?: string;
  description?: string;
  children?: string;
  isRoomHeader?: boolean;
}

interface GroveColumn {
  key: string;
  name: string;
  entries: GroveEntry[];
}

interface GroveCurriculumEnvironmentEntry {
  id: string;
  date?: string;
  purpose?: string;
  isSchoolReadiness?: boolean;
}

interface GroveCurriculumSpontaneousEntry {
  id: string;
  date?: string;
  title?: string;
}

interface GroveCurriculumOutdoorEntry {
  id: string;
  date?: string;
  description?: string;
  children?: string;
}

interface GroveCurriculumColumn {
  key: string;
  name: string;
  environment: GroveCurriculumEnvironmentEntry[];
  spontaneous: GroveCurriculumSpontaneousEntry[];
  outdoor: GroveCurriculumOutdoorEntry[];
}

@Injectable()
export class PdfService {
  private readonly groveNames: Record<string, string> = {
    groveBody: 'Grove Body',
    groveMind: 'Grove Mind',
    groveHeart: 'Grove Heart',
    groveCompass: 'Grove Compass',
    groveExpression: 'Grove Expression',
  };

  private readonly groveKeys: Record<string, string> = {
    groveBody: 'body',
    groveMind: 'mind',
    groveHeart: 'heart',
    groveCompass: 'compass',
    groveExpression: 'expression',
  };

  private browserPromise: Promise<puppeteer.Browser> | null = null;

  constructor(
    private readonly groveCurriculumService: GroveCurriculumService,
    @InjectModel(Campus.name) private campusModel: Model<Campus>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
  ) {}

  async generateOutdoorLearningPdf(dto: GenerateOutdoorLearningPdfDto): Promise<{ pdf: Buffer; campusName: string; roomName: string }> {
    const groveCurricula: GroveCurriculum[] = [];

    const curriculaResults = await Promise.all(
      dto.rooms.map((roomId) => {
        const queryParams: GetGroveCurriculumDto = {
          month: dto.month,
          year: dto.year,
          campus: dto.campus,
          room: roomId,
        };

        return this.groveCurriculumService.findOne(queryParams);
      }),
    );

    for (const result of curriculaResults) {
      if (!result || (result as any).data === null) {
        continue;
      }

      const curriculum = result as GroveCurriculum;

      if (!this.hasOutdoorLearningData(curriculum)) {
        continue;
      }

      groveCurricula.push(curriculum);
    }

    let campusName = 'Unknown Campus';
    let roomName = 'Unknown Room';
    let groves: GroveColumn[];

    const campusDoc = await this.campusModel.findById(dto.campus).lean().exec();
    if (campusDoc) {
      campusName = (campusDoc as any).name || 'Unknown Campus';
    }

    const roomDocs = await this.roomModel
      .find({ _id: { $in: dto.rooms } })
      .select('name')
      .lean()
      .exec();

    const roomNames = (roomDocs || [])
      .map((room: any) => (room?.name as string | undefined))
      .filter((name: string | undefined) => !!name);

    if (roomNames.length > 0) {
      roomName = roomNames.join(', ');
    }

    if (groveCurricula.length === 0) {
      groves = this.getEmptyGroves();
    } else {
      groves = this.transformMultipleGroveData(groveCurricula);
    }

    const templatePath = this.getTemplatePath();
    const logoPath = this.getLogoPath();
    const logoSvg = readFileSync(logoPath, 'utf-8');
    const logoBase64 = Buffer.from(logoSvg).toString('base64');

    const html = await ejs.renderFile(templatePath, {
      month: dto.month,
      campus: campusName,
      room: roomName,
      groves,
      logoBase64,
    });

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    await page.setViewport({
      width: A4_LANDSCAPE_VIEWPORT_WIDTH,
      height: A4_LANDSCAPE_VIEWPORT_HEIGHT,
    });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
      preferCSSPageSize: true,
    });

    return {
      pdf: Buffer.from(pdf),
      campusName,
      roomName,
    };
  }

  async generateGroveCurriculumPdf(dto: GenerateGroveCurriculumPdfDto): Promise<{ pdf: Buffer; campusName: string; roomName: string }> {
    const queryParams: GetGroveCurriculumDto = {
      month: dto.month,
      year: dto.year,
      campus: dto.campus,
      room: dto.room,
    };

    const result = await this.groveCurriculumService.findOne(queryParams);

    let campusName = 'Unknown Campus';
    let roomName = 'Unknown Room';
    let groves: GroveCurriculumColumn[];
    let whereToNext: string | undefined;
    let schoolReadinessFocusPoint: string | undefined;

    if (!result || (result as any).data === null) {
      const [campusDoc, roomDoc] = await Promise.all([
        this.campusModel.findById(dto.campus).lean().exec(),
        this.roomModel.findById(dto.room).lean().exec(),
      ]);

      if (campusDoc) {
        campusName = (campusDoc as any).name || 'Unknown Campus';
      }

      if (roomDoc) {
        roomName = (roomDoc as any).name || 'Unknown Room';
      }

      groves = this.getEmptyGroveCurriculumColumns();
    } else {
      const curriculum = result as GroveCurriculum;
      campusName = (curriculum.campus as any)?.name || 'Unknown Campus';
      roomName = (curriculum.room as any)?.name || 'Unknown Room';
      groves = this.transformGroveCurriculumColumns(curriculum);
      whereToNext = curriculum.whereToNext;
      schoolReadinessFocusPoint = curriculum.schoolReadinessFocusPoint;
    }

    const templatePath = this.getGroveCurriculumTemplatePath();
    const logoPath = this.getLogoPath();
    const logoSvg = readFileSync(logoPath, 'utf-8');
    const logoBase64 = Buffer.from(logoSvg).toString('base64');
    const schoolIconPath = this.getSchoolIconPath();
    const schoolIconSvg = readFileSync(schoolIconPath, 'utf-8');
    const schoolIconBase64 = Buffer.from(schoolIconSvg).toString('base64');

    const html = await ejs.renderFile(templatePath, {
      month: dto.month,
      campus: campusName,
      room: roomName,
      groves,
      whereToNext,
      schoolReadinessFocusPoint,
      logoBase64,
      schoolIconBase64,
    });

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    await page.setViewport({
      width: A4_LANDSCAPE_VIEWPORT_WIDTH,
      height: A4_LANDSCAPE_VIEWPORT_HEIGHT,
    });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
      preferCSSPageSize: true,
    });

    return {
      pdf: Buffer.from(pdf),
      campusName,
      roomName,
    };
  }

  async generateGroveCurriculumFamilyPdf(dto: GenerateGroveCurriculumPdfDto): Promise<{ pdf: Buffer; campusName: string; roomName: string }> {
    const queryParams: GetGroveCurriculumDto = {
      month: dto.month,
      year: dto.year,
      campus: dto.campus,
      room: dto.room,
    };

    const result = await this.groveCurriculumService.findOne(queryParams);

    let campusName = 'Unknown Campus';
    let roomName = 'Unknown Room';
    let groves: GroveCurriculumColumn[];

    if (!result || (result as any).data === null) {
      const [campusDoc, roomDoc] = await Promise.all([
        this.campusModel.findById(dto.campus).lean().exec(),
        this.roomModel.findById(dto.room).lean().exec(),
      ]);

      if (campusDoc) {
        campusName = (campusDoc as any).name || 'Unknown Campus';
      }

      if (roomDoc) {
        roomName = (roomDoc as any).name || 'Unknown Room';
      }

      groves = this.getEmptyGroveCurriculumColumns();
    } else {
      const curriculum = result as GroveCurriculum;
      campusName = (curriculum.campus as any)?.name || 'Unknown Campus';
      roomName = (curriculum.room as any)?.name || 'Unknown Room';
      groves = this.transformGroveCurriculumColumns(curriculum);
    }

    const templatePath = this.getGroveCurriculumFamilyTemplatePath();
    const logoPath = this.getLogoPath();
    const logoSvg = readFileSync(logoPath, 'utf-8');
    const logoBase64 = Buffer.from(logoSvg).toString('base64');
    const schoolIconPath = this.getSchoolIconPath();
    const schoolIconSvg = readFileSync(schoolIconPath, 'utf-8');
    const schoolIconBase64 = Buffer.from(schoolIconSvg).toString('base64');

    const html = await ejs.renderFile(templatePath, {
      month: dto.month,
      campus: campusName,
      room: roomName,
      groves,
      logoBase64,
      schoolIconBase64,
    });

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    await page.setViewport({
      width: A4_LANDSCAPE_VIEWPORT_WIDTH,
      height: A4_LANDSCAPE_VIEWPORT_HEIGHT,
    });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
      preferCSSPageSize: true,
    });

    return {
      pdf: Buffer.from(pdf),
      campusName,
      roomName,
    };
  }

  private transformGroveData(curriculum: GroveCurriculum): GroveColumn[] {
    const groveColumns: GroveColumn[] = [];

    const groveFields = ['groveBody', 'groveMind', 'groveHeart', 'groveCompass', 'groveExpression'] as const;
    const roomName = (curriculum.room as any)?.name || 'Unknown Room';

    for (const field of groveFields) {
      const groveData = curriculum[field];
      if (!groveData || !Array.isArray(groveData)) {
        groveColumns.push({
          key: this.groveKeys[field],
          name: this.groveNames[field],
          entries: [],
        });
        continue;
      }

      const entries: GroveEntry[] = [];

      for (const category of groveData) {
        if (category.outdoorLearning && Array.isArray(category.outdoorLearning)) {
          for (const outdoorLearning of category.outdoorLearning) {
            const date = outdoorLearning.date
              ? new Date(outdoorLearning.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '';

            const children = outdoorLearning.children
              ? (Array.isArray(outdoorLearning.children)
                  ? outdoorLearning.children.map((child: any) => child?.fullName || child).join(', ')
                  : '')
              : '';

            entries.push({
              id: (outdoorLearning as any)._id?.toString() || Math.random().toString(36).substr(2, 9),
              date,
              description: outdoorLearning.purpose || '',
              children,
            });
          }
        }
      }

      if (entries.length > 0) {
        entries.unshift({
          id: `${(curriculum.room as any)?._id || (curriculum as any)._id}-${field}-header`,
          room: roomName,
          isRoomHeader: true,
        });
      }

      groveColumns.push({
        key: this.groveKeys[field],
        name: this.groveNames[field],
        entries,
      });
    }

    return groveColumns;
  }

  private hasOutdoorLearningData(curriculum: GroveCurriculum): boolean {
    const groveFields = ['groveBody', 'groveMind', 'groveHeart', 'groveCompass', 'groveExpression'] as const;

    for (const field of groveFields) {
      const groveData = curriculum[field];
      if (!groveData || !Array.isArray(groveData)) {
        continue;
      }

      for (const category of groveData) {
        if (category.outdoorLearning && Array.isArray(category.outdoorLearning) && category.outdoorLearning.length > 0) {
          return true;
        }
      }
    }

    return false;
  }

  private transformMultipleGroveData(curricula: GroveCurriculum[]): GroveColumn[] {
    const mergedColumns: { [key: string]: GroveColumn } = {};
    const groveFields = ['groveBody', 'groveMind', 'groveHeart', 'groveCompass', 'groveExpression'] as const;

    for (const curriculum of curricula) {
      const columns = this.transformGroveData(curriculum);

      for (const column of columns) {
        if (!mergedColumns[column.key]) {
          mergedColumns[column.key] = {
            key: column.key,
            name: column.name,
            entries: [],
          };
        }

        mergedColumns[column.key].entries = mergedColumns[column.key].entries.concat(column.entries);
      }
    }

    return groveFields.map((field) => {
      const key = this.groveKeys[field];
      const existing = mergedColumns[key];
      if (existing) {
        return existing;
      }
      return {
        key,
        name: this.groveNames[field],
        entries: [],
      };
    });
  }

  private getEmptyGroves(): GroveColumn[] {
    const groveFields = ['groveBody', 'groveMind', 'groveHeart', 'groveCompass', 'groveExpression'] as const;
    return groveFields.map((field) => ({
      key: this.groveKeys[field],
      name: this.groveNames[field],
      entries: [],
    }));
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    return this.browserPromise;
  }

  private transformGroveCurriculumColumns(curriculum: GroveCurriculum): GroveCurriculumColumn[] {
    const columns: GroveCurriculumColumn[] = [];
    const groveFields = ['groveBody', 'groveMind', 'groveHeart', 'groveCompass', 'groveExpression'] as const;

    for (const field of groveFields) {
      const groveData = curriculum[field];
      const environment: GroveCurriculumEnvironmentEntry[] = [];
      const spontaneous: GroveCurriculumSpontaneousEntry[] = [];
      const outdoor: GroveCurriculumOutdoorEntry[] = [];

      if (groveData && Array.isArray(groveData)) {
        for (const category of groveData) {
          if (category.environment && Array.isArray(category.environment)) {
            for (const env of category.environment) {
              const date = env.date
                ? new Date(env.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : undefined;

              environment.push({
                id: (env as any)._id?.toString() || Math.random().toString(36).substr(2, 9),
                date,
                purpose: env.purpose || '',
                isSchoolReadiness: !!(env as any).schoolReadiness,
              });
            }
          }

          if (category.spontaneousLearning && Array.isArray(category.spontaneousLearning)) {
            for (const spont of category.spontaneousLearning) {
              const date = spont.date
                ? new Date(spont.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : undefined;

              spontaneous.push({
                id: (spont as any)._id?.toString() || Math.random().toString(36).substr(2, 9),
                date,
                title: spont.title || '',
              });
            }
          }

          if (category.outdoorLearning && Array.isArray(category.outdoorLearning)) {
            for (const outdoorLearning of category.outdoorLearning) {
              const date = outdoorLearning.date
                ? new Date(outdoorLearning.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : undefined;

              const children = outdoorLearning.children
                ? (Array.isArray(outdoorLearning.children)
                    ? outdoorLearning.children.map((child: any) => child?.fullName || child).join(', ')
                    : '')
                : '';

              outdoor.push({
                id: (outdoorLearning as any)._id?.toString() || Math.random().toString(36).substr(2, 9),
                date,
                description: outdoorLearning.purpose || '',
                children,
              });
            }
          }
        }
      }

      columns.push({
        key: this.groveKeys[field],
        name: this.groveNames[field],
        environment,
        spontaneous,
        outdoor,
      });
    }

    return columns;
  }

  private getEmptyGroveCurriculumColumns(): GroveCurriculumColumn[] {
    const groveFields = ['groveBody', 'groveMind', 'groveHeart', 'groveCompass', 'groveExpression'] as const;
    return groveFields.map((field) => ({
      key: this.groveKeys[field],
      name: this.groveNames[field],
      environment: [],
      spontaneous: [],
      outdoor: [],
    }));
  }

  private getGroveCurriculumTemplatePath(): string {
    const possiblePaths = [
      join(process.cwd(), 'src', 'modules', 'pdf', 'templates', 'grove-curriculum.ejs'),
      join(process.cwd(), 'dist', 'modules', 'pdf', 'templates', 'grove-curriculum.ejs'),
      join(__dirname, '..', 'templates', 'grove-curriculum.ejs'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    throw new Error('Grove curriculum template file not found in any of the expected locations');
  }

  private getGroveCurriculumFamilyTemplatePath(): string {
    const possiblePaths = [
      join(process.cwd(), 'src', 'modules', 'pdf', 'templates', 'grove-curriculum-family.ejs'),
      join(process.cwd(), 'dist', 'modules', 'pdf', 'templates', 'grove-curriculum-family.ejs'),
      join(__dirname, '..', 'templates', 'grove-curriculum-family.ejs'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    throw new Error('Grove curriculum family template file not found in any of the expected locations');
  }

  private getTemplatePath(): string {
    const possiblePaths = [
      join(process.cwd(), 'src', 'modules', 'pdf', 'templates', 'outdoor-learning.ejs'),
      join(process.cwd(), 'dist', 'modules', 'pdf', 'templates', 'outdoor-learning.ejs'),
      join(__dirname, '..', 'templates', 'outdoor-learning.ejs'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    throw new Error('Template file not found in any of the expected locations');
  }

  private getLogoPath(): string {
    const possiblePaths = [
      join(process.cwd(), 'src', 'public', 'tga-logo.svg'),
      join(process.cwd(), 'dist', 'public', 'tga-logo.svg'),
      join(process.cwd(), 'public', 'tga-logo.svg'),
      join(__dirname, '..', '..', '..', 'public', 'tga-logo.svg'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    throw new Error('Logo file not found in any of the expected locations');
  }

  private getSchoolIconPath(): string {
    const possiblePaths = [
      join(process.cwd(), 'src', 'public', 'school.svg'),
      join(process.cwd(), 'dist', 'public', 'school.svg'),
      join(process.cwd(), 'public', 'school.svg'),
      join(__dirname, '..', '..', '..', 'public', 'school.svg'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    throw new Error('School icon file not found in any of the expected locations');
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  generateFileName(campusName: string, roomName: string, month: string, year: string): string {
    const sanitizedCampus = this.sanitizeFileName(campusName);
    const sanitizedRoom = this.sanitizeFileName(roomName);
    const sanitizedMonth = this.sanitizeFileName(month);
    const sanitizedYear = this.sanitizeFileName(year);
    return `grove-curriculum-outdoor-learning-${sanitizedCampus}-${sanitizedRoom}-${sanitizedMonth}-${sanitizedYear}.pdf`;
  }
}

