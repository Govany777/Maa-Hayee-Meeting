import { app, startServer } from '../server/_core/index';

let isInitialized = false;

export default async (req: any, res: any) => {
    try {
        if (!isInitialized) {
            console.log("Starting server...");
            await startServer();
            isInitialized = true;
        }

        // This allows TRPC and other JSON requests to pass correctly
        return new Promise((resolve, reject) => {
            app(req, res, (err: any) => {
                if (err) return reject(err);
                resolve(res);
            });
        });
    } catch (error: any) {
        console.error("Vercel Function Error:", error);
        res.status(500).send(`Server Error: ${error.message}\n${error.stack}`);
    }
};
