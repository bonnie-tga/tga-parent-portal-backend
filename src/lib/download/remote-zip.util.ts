import archiver from 'archiver';
import { Response } from 'express';
import { Readable } from 'stream';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { URL } from 'url';

const fetchStream = (source: string): Promise<Readable> =>
  new Promise((resolve, reject) => {
    const client = source.startsWith('https') ? https : http;
    const request = client.get(source, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`Failed to fetch media: ${response.statusCode}`));
        return;
      }
      resolve(response);
    });
    request.on('error', reject);
  });

const buildArchiveFilename = (source: string, index: number): string => {
  try {
    const parsed = new URL(source);
    const basename = path.basename(parsed.pathname);
    if (basename) {
      return `${String(index).padStart(3, '0')}-${basename}`;
    }
  } catch {}
  return `${String(index).padStart(3, '0')}.bin`;
};

export const streamRemoteFilesAsZip = async (
  res: Response,
  sources: string[],
  filename: string,
): Promise<void> => {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', () => {
    res.status(500).end();
  });
  archive.pipe(res);

  let index = 1;
  for (const source of sources) {
    const stream = await fetchStream(source);
    archive.append(stream, {
      name: buildArchiveFilename(source, index),
    });
    index += 1;
  }

  await new Promise<void>((resolve, reject) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    res.on('error', reject);
    archive.on('error', reject);
    archive.finalize().catch(reject);
  });
};
