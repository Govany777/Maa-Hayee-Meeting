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
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            initializeApp({
                credential: cert(serviceAccount),
                storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
            });
            console.log("[Firebase] Initialized with FIREBASE_SERVICE_ACCOUNT_JSON");
            initialized = true;
        } catch (e) {
            console.error("[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON", e);
        }
    }

    // 2. Try service-account.json file
    if (!initialized && existsSync(resolvedPath)) {
        try {
            const fileContent = readFileSync(resolvedPath, "utf-8");
            const serviceAccount = JSON.parse(fileContent);

            if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
                console.error("[Firebase] Service account file is missing required fields (project_id, client_email, or private_key).");
            } else {
                initializeApp({
                    credential: cert(serviceAccount),
                    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
                });
                console.log(`[Firebase] Initialized with service account from ${serviceAccountPath}`);
                console.log(`[Firebase] Project ID: ${serviceAccount.project_id}`);
                console.log(`[Firebase] Client Email: ${serviceAccount.client_email}`);
                initialized = true;
            }
        } catch (e) {
            console.error("[Firebase] Failed to load service account file", e);
        }
    }

    // 3. Fallback to default credentials (e.g. emulator or GCloud CLI)
    if (!initialized) {
        console.log("[Firebase] Using default credentials or emulator...");
        try {
            initializeApp();
            initialized = true;
        } catch (e) {
            console.error("[Firebase] Default initialization failed", e);
        }
    }

    if (!initialized) {
        console.warn("[Firebase] WARNING: Firebase Admin not initialized. Database operations will fail.");
        // Attempt one last time to avoid crash on export, though it might fail on usage
        try { initializeApp(); } catch (e) { }
    }
}

export const db = getFirestore();
export const storage = getStorage();
export { Timestamp, FieldValue };
