
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
    console.log("[Storage] Attempting to save to Firebase Storage:", relKey);
    const bucket = storage.bucket();
    const file = bucket.file(relKey);
    await file.save(data instanceof Buffer ? data : Buffer.from(data), {
      metadata: { contentType },
      public: true,
    });

    try {
      await file.makePublic();
      console.log("[Storage] File made public successfully");
    } catch (e) {
      console.warn("[Storage] makePublic failed (might already be public):", e.message);
    }

    const url = `https://storage.googleapis.com/${bucket.name}/${relKey}`;
    console.log("[Storage] Successfully saved to Firebase, URL:", url);
    return { key: relKey, url };
  } catch (error: any) {
    console.error("[Storage] Firebase Storage failed:", error.message);
    console.log("[Storage] Falling back to local storage...");

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log("[Storage] Created local uploads directory");
      } catch (mkdirError: any) {
        console.error("[Storage] Failed to create uploads directory:", mkdirError.message);
      }
    }

    const localPath = path.join(uploadsDir, fileName);
    try {
      fs.writeFileSync(localPath, data instanceof Buffer ? data : Buffer.from(data as string));
      console.log("[Storage] Saved file locally to:", localPath);
      const url = `/uploads/${fileName}`;
      return { key: relKey, url };
    } catch (writeError: any) {
      console.error("[Storage] Failed to write file locally:", writeError.message);
      throw writeError;
    }
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  // For now, assume URLs are stored directly in the DB or returned by storagePut
  return { key: relKey, url: relKey };
}
