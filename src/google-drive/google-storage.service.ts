import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
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
export class GoogleStorageService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.bucketName =  process.env.GCS_BUCKET_NAME;
    
    // Only initialize storage if credentials are available
    if (process.env.GCS_PROJECT_ID && process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY) {
      this.storage = new Storage({
        projectId: process.env.GCS_PROJECT_ID,
        credentials: {
          client_email: process.env.GCS_CLIENT_EMAIL,
          private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      });
    } else {
      console.warn('GCS credentials not found. Google Cloud Storage will not be available.');
    }
  }

  /**
   * Upload a single file to Google Cloud Storage
   * @param file Express.Multer.File
   * @param folder Optional folder inside bucket
   * @returns Public URL of the uploaded file
   */
  async uploadFile(
    file: Express.Multer.File,
    folder = 'uploads',
  ): Promise<string> {
    try {
      if (!this.storage) {
        throw new InternalServerErrorException(
          'Google Cloud Storage is not configured. Please set GCS environment variables.',
        );
      }
      
      const bucket = this.storage.bucket(this.bucketName);
      const filename = `${folder}/${uuidv4()}-${file.originalname}`;
      const fileUpload = bucket.file(filename);

      const stream = fileUpload.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
      });

      // Upload the file buffer
      stream.end(file.buffer);

      await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      // Generate a signed URL valid for 1 year (or change duration as needed)
      const [signedUrl] = await fileUpload.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      return signedUrl;
    } catch (err) {
      console.error('GCS upload error:', err);
      throw new InternalServerErrorException(
        'Failed to upload file to Google Cloud Storage',
      );
    }
  }

  /**
   * Upload multiple files to Google Cloud Storage
   * @param files Array of Express.Multer.File
   * @param folder Optional folder inside bucket
   * @returns Array of public URLs of uploaded files
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder = 'uploads',
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const url = await this.uploadFile(file, folder);
      urls.push(url);
    }
    return urls;
  }

  async uploadFileG(
    file: Express.Multer.File, 
    folder: string = 'uploads'
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

      const bucket = this.storage.bucket(this.bucketName);
      const filename = `${folder}/${uuidv4()}-${file.originalname}`;
      const fileUpload = bucket.file(filename);

      const stream = fileUpload.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
      });

      // Upload the file buffer
      stream.end(file.buffer);

      await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      // Generate a signed URL valid for 1 year (or change duration as needed)
      const [signedUrl] = await fileUpload.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });



       return {
        url: signedUrl, // or use publicUrl if you want public access
        gcsPath: filename,
        filename: filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      };


  }


   async uploadFilesG(
    files: Express.Multer.File[],
    folder: string = 'uploads'
  ): Promise<UploadResult[]> {  // ← Change return type to UploadResult[]
    const uploadResults: UploadResult[] = [];
    for (const file of files) {
      const result = await this.uploadFileG(file, folder);
      uploadResults.push(result);
    }
    return uploadResults;
  }

}
