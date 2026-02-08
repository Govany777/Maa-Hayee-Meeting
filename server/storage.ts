
import { storage } from './firebase';
import fs from 'fs';
import path from 'path';

/**
 * Robust storage helper that tries Firebase Storage first, 
 * then falls back to local file system if needed.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "image/jpeg"
): Promise<{ key: string; url: string }> {
  const fileName = relKey.split('/').pop() || `file-${Date.now()}.jpg`;

  try {
    // 1. Try Firebase Storage
    const bucket = storage.bucket();
    // Default bucket name is often project-id.appspot.com or project-id.firebasestorage.app
    // If not set, this might fail unless initialized with a bucket name.

    const file = bucket.file(relKey);
    await file.save(data instanceof Buffer ? data : Buffer.from(data), {
      metadata: { contentType },
      public: true, // Try to make it public
    });

    // Make it public if not already done by save
    try { await file.makePublic(); } catch (e) { /* ignore if fails */ }

    const url = `https://storage.googleapis.com/${bucket.name}/${relKey}`;
    return { key: relKey, url };
  } catch (error) {
    console.error("Firebase Storage failed, falling back to local storage:", error);

    // 2. Fallback to Local Storage
    // Create 'uploads' directory if it doesn't exist
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localPath = path.join(uploadsDir, fileName);
    fs.writeFileSync(localPath, data instanceof Buffer ? data : Buffer.from(data as string));

    // The URL will be /uploads/filename
    // We need to make sure the express app serves this folder
    const url = `/uploads/${fileName}`;
    return { key: relKey, url };
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  // For now, assume URLs are stored directly in the DB or returned by storagePut
  return { key: relKey, url: relKey };
}
