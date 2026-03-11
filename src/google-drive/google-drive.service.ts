import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import stream from 'stream';

@Injectable()
export class GoogleDriveService {
  private drive;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json', // Your service account key
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);

    const response = await this.drive.files.create({
      requestBody: {
        name: file.originalname,
        mimeType: file.mimetype,
        parents: ['YOUR_FOLDER_ID'], // Optional folder
      },
      media: {
        mimeType: file.mimetype,
        body: bufferStream,
      },
      fields: 'id',
    });

    await this.drive.permissions.create({
      fileId: response.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    return `https://drive.google.com/uc?id=${response.data.id}`;
  }
}
