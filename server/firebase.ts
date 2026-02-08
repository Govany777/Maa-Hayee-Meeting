import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import "dotenv/config";

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./service-account.json";
const resolvedPath = resolve(process.cwd(), serviceAccountPath);

// Initialization function
export const initFirebase = () => {
    if (getApps().length > 0) return getApp();

    let initialized = false;
    const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (envJson) {
        try {
            const serviceAccount = JSON.parse(envJson.trim());
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            initializeApp({
                credential: cert(serviceAccount),
                storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
            });
            console.log("[Firebase] Initialized with ENV JSON");
            initialized = true;
        } catch (e) {
            console.error("[Firebase] ENV JSON parse failed:", e);
        }
    }

    if (!initialized && existsSync(resolvedPath)) {
        try {
            const serviceAccount = JSON.parse(readFileSync(resolvedPath, "utf-8"));
            initializeApp({
                credential: cert(serviceAccount),
                storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
            });
            console.log("[Firebase] Initialized with local file");
            initialized = true;
        } catch (e) {
            console.error("[Firebase] Local file failed:", e);
        }
    }

    if (!initialized) {
        try {
            initializeApp();
            console.log("[Firebase] Initialized with defaults");
        } catch (e) {
            console.error("[Firebase] All ways failed");
        }
    }
};

// Start initialization immediately
initFirebase();

// Export proxies for db and storage to avoid top-level null issues
export const db = getFirestore();
export const storage = getStorage();
export { Timestamp, FieldValue };
