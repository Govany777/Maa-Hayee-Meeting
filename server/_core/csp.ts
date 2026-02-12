import type { Request, Response, NextFunction } from "express";

/**
 * Content Security Policy (CSP) middleware
 * Helps protect against XSS, clickjacking, and other attacks.
 * Set DISABLE_CSP=1 in env to turn off if needed for debugging.
 */
export function cspMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (process.env.DISABLE_CSP === "1") {
    return next();
  }

  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Vite/React needs these
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  res.setHeader("Content-Security-Policy", directives);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  next();
}
