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

    const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (envJson) {
        try {
            const serviceAccount = JSON.parse(envJson.trim());
            console.log("[Firebase] Attempting to initialize with Project ID:", serviceAccount.project_id);

            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            return initializeApp({
                credential: cert(serviceAccount),
                projectId: serviceAccount.project_id, // Explicitly set Project ID
                storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
            });
        } catch (e: any) {
            console.error("[Firebase] Critical Error parsing FIREBASE_SERVICE_ACCOUNT_JSON. Make sure you pasted the ENTIRE JSON content.");
            console.error("[Firebase] Error details:", e.message);
        }
    }

    if (existsSync(resolvedPath)) {
        try {
            const serviceAccount = JSON.parse(readFileSync(resolvedPath, "utf-8"));
            console.log("[Firebase] Initializing with local file, Project ID:", serviceAccount.project_id);
            return initializeApp({
                credential: cert(serviceAccount),
                projectId: serviceAccount.project_id,
                storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
            });
        } catch (e: any) {
            console.error("[Firebase] Failed to load local service account file:", e.message);
        }
    }

    // Last resort fallback
    try {
        console.warn("[Firebase] Falling back to default credentials...");
        return initializeApp();
    } catch (e: any) {
        console.error("[Firebase] All initialization attempts failed:", e.message);
        return null;
    }
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
