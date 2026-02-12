import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { cspMiddleware } from "./csp";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export const app = express();

export async function startServer() {
  const server = createServer(app);

  // Enable trust proxy for secure cookies behind proxies (Railway, Vercel, Render)
  app.set("trust proxy", 1);
  // Validate JWT_SECRET in production - required for session cookies
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET?.trim()) {
    console.error("[FATAL] JWT_SECRET is required in production. Set it in your hosting environment variables.");
  }

  // Content Security Policy and security headers
  app.use(cspMiddleware);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Serve uploads folder locally
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else if (!process.env.VERCEL) {
    // Only serve static files locally, on Vercel we let Vercel handle it via rewrites
    serveStatic(app);
  }

  // Only listen on a port if we're not running as a serverless function (Vercel)
  if (!process.env.VERCEL) {
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);

    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }

    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  }
}

// Only auto-start if not on Vercel
if (!process.env.VERCEL) {
  startServer().catch(console.error);
}
