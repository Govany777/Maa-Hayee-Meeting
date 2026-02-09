import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import "dotenv/config";

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./service-account.json";
const resolvedPath = resolve(process.cwd(), serviceAccountPath);

// Pure function to initialize
function initializeFirebaseAdmin() {
    if (getApps().length > 0) return getApp();

    const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (envJson) {
        try {
            const serviceAccount = JSON.parse(envJson.trim());
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            return initializeApp({
                credential: cert(serviceAccount),
                storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
            });
        } catch (e) {
            console.error("[Firebase] Failed to initialize from ENV JSON:", e);
        }
    }

    if (existsSync(resolvedPath)) {
        try {
            const serviceAccount = JSON.parse(readFileSync(resolvedPath, "utf-8"));
            return initializeApp({
                credential: cert(serviceAccount),
                storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
            });
        } catch (e) {
            console.error("[Firebase] Failed to initialize from local file:", e);
        }
    }

    // Last resort
    try {
        return initializeApp();
    } catch (e) {
        console.error("[Firebase] All initialization attempts failed.");
        return null;
    }
}

// Global initialization
initializeFirebaseAdmin();

// Proxies to prevent top-level crashes
export const db = {
    collection: (name: string) => {
        if (getApps().length === 0) throw new Error("Firebase not initialized");
        return getFirestore().collection(name);
    },
    runTransaction: (updateFunction: any) => {
        if (getApps().length === 0) throw new Error("Firebase not initialized");
        return getFirestore().runTransaction(updateFunction);
    }
} as any;

export const storage = {
    bucket: () => {
        if (getApps().length === 0) throw new Error("Firebase not initialized");
        return getStorage().bucket();
    }
} as any;

export { Timestamp, FieldValue } from "firebase-admin/firestore";
