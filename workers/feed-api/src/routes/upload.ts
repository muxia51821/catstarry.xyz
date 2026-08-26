import type { FeedMediaUploadResponse } from '../../../../shared/types';
import { apiError, json } from '../lib/http';
import { requireMainSession } from './auth';
import { shanghaiMonthKey } from '../../../../shared/shanghai-time';

const IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/heic', 'heic'],
  ['image/heif', 'heic'],
]);
const VIDEO_TYPES = new Map([
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
  ['video/quicktime', 'mov'],
]);
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const MP4_BRANDS = new Set(['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'dash']);
const MOV_BRANDS = new Set(['qt  ']);
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']);

export async function handleUpload(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const session = await requireMainSession(request, env);
  if (session instanceof Response) return session;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, 'invalid_upload', 'Request must contain multipart form data');
  }
  const file = form.get('file');
  if (!(file instanceof File)) return apiError(400, 'invalid_upload', 'file is required');
  const declaredMime = file.type.toLowerCase();
  const imageExtension = IMAGE_TYPES.get(declaredMime);
  const videoExtension = VIDEO_TYPES.get(declaredMime);
  const extension = imageExtension ?? videoExtension;
  if (!extension) return apiError(415, 'unsupported_media', 'This media type is not allowed');
  const maximum = imageExtension ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size === 0 || file.size > maximum) return apiError(413, 'media_too_large', 'The uploaded file exceeds the allowed size');
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const normalizedMime = normalizedMediaMime(declaredMime);
  if (!normalizedMime || !hasMatchingSignature(header, normalizedMime, extension)) {
    return apiError(415, 'media_signature_mismatch', 'The media signature does not match its declared type');
  }
  const month = shanghaiMonthKey(new Date());
  const key = `feed/${month}/${crypto.randomUUID()}.${extension}`;
  try {
    await env.MEDIA_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: normalizedMime },
      customMetadata: { upload_state: 'temporary' },
    });
  } catch {
    return apiError(503, 'upload_failed', 'Media upload failed; retry the file');
  }
  const response: FeedMediaUploadResponse = { key, content_type: normalizedMime, size: file.size };
  return json(response, 201);
}

function normalizedMediaMime(mime: string): string | null {
  if (mime === 'image/heif') return 'image/heic';
  return IMAGE_TYPES.has(mime) || VIDEO_TYPES.has(mime) ? mime : null;
}

function hasMatchingSignature(header: Uint8Array, mime: string, extension: string): boolean {
  const startsWith = (...bytes: number[]) => bytes.every((byte, index) => header[index] === byte);
  const brand = header.length >= 12 ? new TextDecoder().decode(header.slice(8, 12)) : '';
  if (mime === 'image/jpeg') return extension === 'jpg' && startsWith(0xff, 0xd8, 0xff);
  if (mime === 'image/png') return extension === 'png' && startsWith(...PNG_SIGNATURE);
  if (mime === 'image/webp') return extension === 'webp' && startsWith(0x52, 0x49, 0x46, 0x46) && new TextDecoder().decode(header.slice(8, 12)) === 'WEBP';
  if (mime === 'video/webm') return extension === 'webm' && startsWith(0x1a, 0x45, 0xdf, 0xa3);
  if (header.length < 12) return false;
  if (new TextDecoder().decode(header.slice(4, 8)) !== 'ftyp') return false;
  if (mime === 'video/mp4') return extension === 'mp4' && MP4_BRANDS.has(brand);
  if (mime === 'video/quicktime') return extension === 'mov' && MOV_BRANDS.has(brand);
  return mime === 'image/heic' && extension === 'heic' && HEIC_BRANDS.has(brand);
}
