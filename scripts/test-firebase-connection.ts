
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import "dotenv/config";

async function testFirebase() {
    console.log("Starting Firebase connection test...");

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./service-account.json";
    const resolvedPath = resolve(process.cwd(), serviceAccountPath);

    console.log(`Checking for service account at: ${resolvedPath}`);

    if (!existsSync(resolvedPath)) {
        console.error("ERROR: Service account file not found!");
        process.exit(1);
    }

    try {
        const fileContent = readFileSync(resolvedPath, "utf-8");
        const serviceAccount = JSON.parse(fileContent);

        console.log("Service account file loaded successfully.");
        console.log(`Project ID: ${serviceAccount.project_id}`);
        console.log(`Client Email: ${serviceAccount.client_email}`);

        // Initialize Firebase
        if (getApps().length === 0) {
            initializeApp({ credential: cert(serviceAccount) });
            console.log("Firebase Admin SDK initialized.");
        }

        const db = getFirestore();
        console.log("Attempting to list collections...");

        const collections = await db.listCollections();
        console.log("Successfully connected to Firestore!");
        console.log("Collections found:", collections.map(c => c.id).join(", "));

    } catch (error: any) {
        console.error("ERROR during Firebase connection test:");
        if (error.code) {
            console.error(`Error Code: ${error.code}`);
        }
        console.error(error.message);
        if (error.details) {
            console.error(`Details: ${error.details}`);
        }
    }
}

testFirebase();
