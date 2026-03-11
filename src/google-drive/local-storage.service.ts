import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  url: string;
  gcsPath: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class LocalStorageService {
  private baseUrl: string;
  private uploadsDir: string;

  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:4000';
    this.uploadsDir = join(process.cwd(), 'uploads');
    
    if (!existsSync(this.uploadsDir)) {
      mkdir(this.uploadsDir, { recursive: true }).catch((err) => {
        console.error('Failed to create uploads directory:', err);
      });
    }
  }

  async uploadFileG(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      const folderPath = join(this.uploadsDir, folder);
      
      if (!existsSync(folderPath)) {
        await mkdir(folderPath, { recursive: true });
      }

      const filename = `${uuidv4()}-${file.originalname}`;
      const filePath = join(folderPath, filename);
      
      await writeFile(filePath, file.buffer);

      const url = `${this.baseUrl}/api/uploads/${folder}/${filename}`;
      const relativePath = `${folder}/${filename}`;

      return {
        url,
        gcsPath: relativePath,
        filename: relativePath,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      console.error('Local storage upload error:', error);
      throw new InternalServerErrorException(
        `Failed to upload file: ${file.originalname}. ${error.message || error}`,
      );
    }
  }

  async uploadFilesG(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<UploadResult[]> {
    const uploadResults: UploadResult[] = [];
    for (const file of files) {
      const result = await this.uploadFileG(file, folder);
      uploadResults.push(result);
    }
    return uploadResults;
  }
}
