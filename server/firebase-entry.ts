import * as functions from "firebase-functions";
import { app, startServer } from "./_core/index";

// تهيئة السيرفر (زي ما عملنا في Vercel)
let isInitialized = false;

export const api = functions.https.onRequest(async (req, res) => {
  if (!isInitialized) {
    await startServer();
    isInitialized = true;
  }
  return app(req, res);
});
