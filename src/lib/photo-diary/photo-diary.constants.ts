import { MediaType } from '../../modules/media/media.entity';

export const ALLOWED_MEDIA_TYPES: MediaType[] = [
  MediaType.IMAGE,
  MediaType.VIDEO,
];

export const ALLOWED_MEDIA_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
];
