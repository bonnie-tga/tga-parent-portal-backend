import { BadRequestException } from '@nestjs/common';

export interface FileValidationConfig {
  maxImageSize?: number;
  maxDocumentSize?: number;
  maxAudioSize?: number;
  maxVideoSize?: number;
  allowedImageTypes?: string[];
  allowedDocumentTypes?: string[];
  allowedAudioTypes?: string[];
  allowedVideoTypes?: string[];
}

export interface FileValidationResult {
  type: 'image' | 'document' | 'audio' | 'video' | 'other';
  isValid: boolean;
  error?: string;
}

const DEFAULT_CONFIG: Required<FileValidationConfig> = {
  maxImageSize: 10 * 1024 * 1024, // 10 MB
  maxDocumentSize: 20 * 1024 * 1024, // 20 MB
  maxAudioSize: 25 * 1024 * 1024, // 25 MB
  maxVideoSize: 100 * 1024 * 1024, // 100 MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  allowedDocumentTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain',
  ],
  allowedAudioTypes: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/m4a', 'audio/wav', 'audio/ogg', 'audio/webm'],
  allowedVideoTypes: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/ogg'],
};

export function validateFile(file: Express.Multer.File, config?: FileValidationConfig): FileValidationResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const mimeType = file.mimetype.toLowerCase();

  let type: 'image' | 'document' | 'audio' | 'video' | 'other';
  let maxSize: number;
  let allowedTypes: string[];
  let typeName: string;

  if (mimeType.startsWith('image/') || finalConfig.allowedImageTypes.includes(mimeType)) {
    type = 'image';
    maxSize = finalConfig.maxImageSize;
    allowedTypes = finalConfig.allowedImageTypes;
    typeName = 'Image';
    if (!finalConfig.allowedImageTypes.includes(mimeType)) {
      return {
        type: 'image',
        isValid: false,
        error: `File ${file.originalname} is not a supported image format. Allowed: JPEG, PNG, GIF, WEBP, SVG`,
      };
    }
  } else if (mimeType.startsWith('video/') || finalConfig.allowedVideoTypes.includes(mimeType)) {
    type = 'video';
    maxSize = finalConfig.maxVideoSize;
    allowedTypes = finalConfig.allowedVideoTypes;
    typeName = 'Video';
    if (!finalConfig.allowedVideoTypes.includes(mimeType)) {
      return {
        type: 'video',
        isValid: false,
        error: `File ${file.originalname} is not a supported video format. Allowed: MP4, AVI, MOV, WEBM`,
      };
    }
  } else if (mimeType.startsWith('audio/') || finalConfig.allowedAudioTypes.includes(mimeType)) {
    type = 'audio';
    maxSize = finalConfig.maxAudioSize;
    allowedTypes = finalConfig.allowedAudioTypes;
    typeName = 'Audio';
    if (!finalConfig.allowedAudioTypes.includes(mimeType)) {
      return {
        type: 'audio',
        isValid: false,
        error: `File ${file.originalname} is not a supported audio format. Allowed: MP3, AAC, M4A, WAV, OGG`,
      };
    }
  } else if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    finalConfig.allowedDocumentTypes.includes(mimeType)
  ) {
    type = 'document';
    maxSize = finalConfig.maxDocumentSize;
    allowedTypes = finalConfig.allowedDocumentTypes;
    typeName = 'Document';
    if (!finalConfig.allowedDocumentTypes.includes(mimeType)) {
      return {
        type: 'document',
        isValid: false,
        error: `File ${file.originalname} is not a supported document format. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT`,
      };
    }
  } else {
    return {
      type: 'other',
      isValid: false,
      error: `File ${file.originalname} has unsupported file type. Allowed: Images, Videos, Audio, Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX)`,
    };
  }

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      type,
      isValid: false,
      error: `${typeName} file ${file.originalname} (${fileSizeMB}MB) exceeds maximum file size of ${maxSizeMB}MB`,
    };
  }

  return {
    type,
    isValid: true,
  };
}

export function validateFiles(files: Express.Multer.File[], config?: FileValidationConfig): void {
  if (!files || files.length === 0) {
    throw new BadRequestException('No files provided');
  }

  for (const file of files) {
    const validation = validateFile(file, config);
    if (!validation.isValid) {
      throw new BadRequestException(validation.error);
    }
  }
}

export function getFileType(mimeType: string): 'image' | 'document' | 'audio' | 'video' | 'other' {
  const mime = mimeType.toLowerCase();
  const config = DEFAULT_CONFIG;

  if (mime.startsWith('image/') || config.allowedImageTypes.includes(mime)) {
    return 'image';
  } else if (mime.startsWith('video/') || config.allowedVideoTypes.includes(mime)) {
    return 'video';
  } else if (mime.startsWith('audio/') || config.allowedAudioTypes.includes(mime)) {
    return 'audio';
  } else if (
    mime.includes('pdf') ||
    mime.includes('document') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation') ||
    config.allowedDocumentTypes.includes(mime)
  ) {
    return 'document';
  }
  return 'other';
}
