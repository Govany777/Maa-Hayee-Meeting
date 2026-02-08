import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import "dotenv/config";

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./service-account.json";
const resolvedPath = resolve(process.cwd(), serviceAccountPath);

if (getApps().length === 0) {
    let initialized = false;

    // 1. Try environment variable JSON
    const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (envJson) {
        try {
            // Clean the string in case it has weird characters or literal \n
            let cleanJson = envJson.trim();
            const serviceAccount = JSON.parse(cleanJson);

            // Fix private_key if newlines are escaped
            if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            initializeApp({
                credential: cert(serviceAccount),
                storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
            });
            console.log("[Firebase] Initialized with FIREBASE_SERVICE_ACCOUNT_JSON");
            initialized = true;
        } catch (e) {
            console.error("[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
        }
    }

    // 2. Try service-account.json file as fallback
    if (!initialized && existsSync(resolvedPath)) {
        try {
            const fileContent = readFileSync(resolvedPath, "utf-8");
            const serviceAccount = JSON.parse(fileContent);

            if (serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key) {
                initializeApp({
                    credential: cert(serviceAccount),
                    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
                });
                console.log(`[Firebase] Initialized with service account file`);
                initialized = true;
            }
        } catch (e) {
            console.error("[Firebase] Failed to load service account file:", e);
        }
    }

    // 3. Fallback to default
    if (!initialized) {
        try {
            initializeApp();
            console.log("[Firebase] Initialized with default credentials");
            initialized = true;
        } catch (e) {
            console.error("[Firebase] All initialization attempts failed.");
        }
    }
}

export const db = getFirestore();
export const storage = getStorage();
export { Timestamp, FieldValue };
