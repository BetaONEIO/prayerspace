import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const BUCKET = 'avatars';
const SIGNED_URL_EXPIRY = 3600;
const POST_IMAGE_PREFIX = 'post-images';

export function isStoragePath(value: string | null | undefined): boolean {
  if (!value) return false;
  if (value.startsWith('data:')) return false;
  if (value.startsWith('http')) return false;
  if (value.startsWith('file://')) return false;
  return true;
}

async function uriToUploadable(uri: string, contentType: string): Promise<Blob | Uint8Array> {
  if (Platform.OS !== 'web' && uri.startsWith('file://')) {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  const response = await fetch(uri);
  return response.blob();
}

export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  console.log('[Storage] Uploading avatar for user:', userId);

  const fileExt = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt) ? fileExt : 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${safeExt}`;
  const contentType = safeExt === 'png' ? 'image/png' : 'image/jpeg';

  const uploadData = await uriToUploadable(uri, contentType);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, uploadData, { contentType, upsert: true });

  if (error) {
    console.error('[Storage] Upload error:', error.message);
    throw error;
  }

  console.log('[Storage] Upload success, path:', data.path);
  return data.path;
}

export async function uploadPostImage(userId: string, uri: string): Promise<{ path: string; url: string }> {
  console.log('[Storage] Uploading post image for user:', userId);

  const fileExt = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt) ? fileExt : 'jpg';
  const path = `${POST_IMAGE_PREFIX}/${userId}/${Date.now()}.${safeExt}`;
  const contentType = safeExt === 'png' ? 'image/png' : 'image/jpeg';

  const uploadData = await uriToUploadable(uri, contentType);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, uploadData, { contentType, upsert: false });

  if (error) {
    console.error('[Storage] Post image upload error:', error.message);
    throw error;
  }

  console.log('[Storage] Post image upload success, path:', data.path);

  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(data.path, SIGNED_URL_EXPIRY);

  if (signedError || !signedData) {
    console.error('[Storage] Failed to create signed URL for post image:', signedError?.message);
    throw signedError ?? new Error('Could not create signed URL');
  }

  return { path: data.path, url: signedData.signedUrl };
}

export async function getSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http')) return path;

  console.log('[Storage] Creating signed URL for:', path);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);

  if (error) {
    console.error('[Storage] Signed URL error:', error.message);
    return null;
  }

  return data.signedUrl;
}
