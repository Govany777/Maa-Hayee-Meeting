import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import "dotenv/config";

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./service-account.json";
const resolvedPath = resolve(process.cwd(), serviceAccountPath);

function initializeFirebaseAdmin() {
    if (getApps().length > 0) return getApp();

    let envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (envJson) {
        try {
            // Clean the JSON string from any extra wrapping quotes that some platforms add
            envJson = envJson.trim();
            if (envJson.startsWith("'") && envJson.endsWith("'")) {
                envJson = envJson.slice(1, -1);
            } else if (envJson.startsWith('"') && envJson.endsWith('"')) {
                // Only remove double quotes if it's not a valid JSON yet
                try { JSON.parse(envJson); } catch {
                    envJson = envJson.slice(1, -1).replace(/\\"/g, '"');
                }
            }

            const serviceAccount = JSON.parse(envJson);
            if (serviceAccount.private_key) {
                // Ensure newlines are correctly formatted in the private key
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`;
            console.log("[Firebase] Attempting initialization with Project ID:", serviceAccount.project_id);

            return initializeApp({
                credential: cert(serviceAccount),
                projectId: serviceAccount.project_id,
                storageBucket: bucketName
            });
        } catch (e: any) {
            console.error("[Firebase] CRITICAL ERROR parsing FIREBASE_SERVICE_ACCOUNT_JSON:");
            console.error(e.message);
            // Don't crash the whole process, but mark as failed
        }
    }

    if (existsSync(resolvedPath)) {
        try {
            const serviceAccount = JSON.parse(readFileSync(resolvedPath, "utf-8"));
            const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`;
            console.log("[Firebase] Initializing with local file:", resolvedPath);
            return initializeApp({
                credential: cert(serviceAccount),
                projectId: serviceAccount.project_id,
                storageBucket: bucketName
            });
        } catch (e: any) {
            console.error("[Firebase] Failed to load local service account file:", e.message);
        }
    }

    console.error("[Firebase] FATAL: No valid service account found. Firestore will NOT work.");
    return null;
}

// Global initialization
initializeFirebaseAdmin();

// Proxies to prevent top-level crashes
export const db = {
    collection: (name: string) => {
        if (getApps().length === 0) throw new Error("Firebase Admin not initialized. Check your Environment Variables.");
        return getFirestore().collection(name);
    },
    runTransaction: (updateFunction: any) => {
        if (getApps().length === 0) throw new Error("Firebase Admin not initialized. Check your Environment Variables.");
        return getFirestore().runTransaction(updateFunction);
    }
} as any;

export const storage = {
    bucket: () => {
        if (getApps().length === 0) throw new Error("Firebase Admin not initialized.");
        return getStorage().bucket();
    }
} as any;

export { Timestamp, FieldValue } from "firebase-admin/firestore";
