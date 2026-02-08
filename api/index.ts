import { app, startServer } from '../server/_core/index';

let isInitialized = false;

export default async (req: any, res: any) => {
    try {
        if (!isInitialized) {
            console.log("[Vercel] Starting server initialization...");
            await startServer();
            isInitialized = true;
            console.log("[Vercel] Server initialized successfully");
        }
        // Set some headers to help with trpc/json
        res.setHeader('Content-Type', 'application/json');
        return app(req, res);
    } catch (e: any) {
        console.error("[Vercel] CRITICAL FAILURE:", e);
        // If it's a trpc request, try to return a trpc-compatible error
        if (req.url?.includes('trpc')) {
            return res.status(500).json([{
                error: {
                    message: "Server failed to start: " + e.message,
                    code: -32000,
                    data: { stack: e.stack }
                }
            }]);
        }
        return res.status(500).json({
            error: "Critical Initialization Error",
            message: e.message,
            stack: e.stack
        });
    }
};
