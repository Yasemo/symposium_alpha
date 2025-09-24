import { Context, Next } from "oak";
import { create, verify, getNumericDate } from "djwt";
import { getDatabase } from "../database/connection.ts";

// JWT secret key - in production, this should be from environment variables
const JWT_SECRET = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode("your-secret-key-change-in-production"),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"]
);

export interface AuthUser {
  id: number;
  email: string;
  openrouter_api_key?: string;
}

// Middleware to verify JWT token
export async function authMiddleware(ctx: Context, next: Next) {
  try {
    const authHeader = ctx.request.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.response.status = 401;
      ctx.response.body = { error: "No valid authorization token provided" };
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Verify the JWT token
    const payload = await verify(token, JWT_SECRET);
    
    if (!payload || typeof payload !== "object" || !payload.sub) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid token" };
      return;
    }

    // Get user from database
    const db = getDatabase();
    const result = db.prepare("SELECT id, email, openrouter_api_key FROM users WHERE id = ?").get(payload.sub);
    
    if (!result) {
      ctx.response.status = 401;
      ctx.response.body = { error: "User not found" };
      return;
    }

    // Add user to context state
    const user = result as unknown as AuthUser;
    ctx.state.user = user;
    
    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    ctx.response.status = 401;
    ctx.response.body = { error: "Invalid or expired token" };
  }
}

// Optional auth middleware - doesn't fail if no token provided
export async function optionalAuthMiddleware(ctx: Context, next: Next) {
  try {
    const authHeader = ctx.request.headers.get("Authorization");
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = await verify(token, JWT_SECRET);
      
      if (payload && typeof payload === "object" && payload.sub) {
        const db = getDatabase();
        const result = db.prepare("SELECT id, email, openrouter_api_key FROM users WHERE id = ?").get(payload.sub);
        
        if (result) {
          const user = result as unknown as AuthUser;
          ctx.state.user = user;
        }
      }
    }
    
    await next();
  } catch (error) {
    // Silently continue without auth if token is invalid
    await next();
  }
}

// Helper function to get current user from context
export function getCurrentUser(ctx: Context): AuthUser | null {
  return ctx.state.user || null;
}

// Helper function to require authentication
export function requireAuth(ctx: Context): AuthUser {
  const user = getCurrentUser(ctx);
  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Authentication required" };
    throw new Error("Authentication required");
  }
  return user;
}
