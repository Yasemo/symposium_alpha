import { Application, Router } from "oak";
import { oakCors } from "cors";
import { initDatabase, isDatabaseInitialized, runMigrations, getDatabase } from "./database/connection.ts";
import { authMiddleware, optionalAuthMiddleware } from "./middleware/auth.ts";
import authRoutes from "./routes/auth.ts";
import projectRoutes from "./routes/projects.ts";
import objectiveRoutes from "./routes/objectives.ts";
import taskRoutes from "./routes/tasks.ts";
import messageRoutes from "./routes/messages.ts";
import contentCardRoutes from "./routes/content-cards.ts";
import tagRoutes from "./routes/tags.ts";
import openrouterRoutes from "./routes/openrouter.ts";

const app = new Application();
const router = new Router();

// CORS middleware
app.use(oakCors({
  origin: "*", // In production, specify your frontend domain
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Auth routes (no auth required) - must come before static file serving
app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());

// Protected auth routes (require authentication)
const protectedAuthRoutes = new Router();
protectedAuthRoutes.use(authMiddleware);
protectedAuthRoutes.put("/api/user/api-key", async (ctx) => {
  try {
    const user = ctx.state.user;
    const body = await ctx.request.body({ type: "json" }).value;
    const { apiKey } = body;

    const db = getDatabase();
    
    // Update user's OpenRouter API key
    db.prepare(
      "UPDATE users SET openrouter_api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(apiKey || null, user.id);

    ctx.response.body = { message: "API key updated successfully" };

  } catch (error) {
    console.error("Update API key error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to update API key" };
  }
});

app.use(protectedAuthRoutes.routes());
app.use(protectedAuthRoutes.allowedMethods());

// Basic health check endpoint
router.get("/health", (ctx) => {
  ctx.response.body = { 
    status: "ok", 
    timestamp: new Date().toISOString(),
    database: isDatabaseInitialized() ? "connected" : "disconnected"
  };
});

// API routes placeholder
router.get("/api", (ctx) => {
  ctx.response.body = { 
    message: "Symposium API",
    version: "1.0.0",
    endpoints: [
      "/health",
      "/register",
      "/login",
      "/logout",
      "/me",
      "/api/projects/*",
      "/api/objectives/*",
      "/api/tasks/*",
      "/api/messages/*",
      "/api/knowledge/*"
    ]
  };
});

// Protected API routes (require authentication)
const protectedProjectRoutes = new Router({ prefix: "/api/projects" });
protectedProjectRoutes.use(authMiddleware);
protectedProjectRoutes.use(projectRoutes.routes());
protectedProjectRoutes.use(projectRoutes.allowedMethods());

const protectedObjectiveRoutes = new Router({ prefix: "/api/objectives" });
protectedObjectiveRoutes.use(authMiddleware);
protectedObjectiveRoutes.use(objectiveRoutes.routes());
protectedObjectiveRoutes.use(objectiveRoutes.allowedMethods());

const protectedTaskRoutes = new Router({ prefix: "/api/tasks" });
protectedTaskRoutes.use(authMiddleware);
protectedTaskRoutes.use(taskRoutes.routes());
protectedTaskRoutes.use(taskRoutes.allowedMethods());

const protectedMessageRoutes = new Router({ prefix: "/api/messages" });
protectedMessageRoutes.use(authMiddleware);
protectedMessageRoutes.use(messageRoutes.routes());
protectedMessageRoutes.use(messageRoutes.allowedMethods());

const protectedContentCardRoutes = new Router({ prefix: "/api/content-cards" });
protectedContentCardRoutes.use(authMiddleware);
protectedContentCardRoutes.use(contentCardRoutes.routes());
protectedContentCardRoutes.use(contentCardRoutes.allowedMethods());

const protectedTagRoutes = new Router({ prefix: "/api/tags" });
protectedTagRoutes.use(authMiddleware);
protectedTagRoutes.use(tagRoutes.routes());
protectedTagRoutes.use(tagRoutes.allowedMethods());

const protectedOpenRouterRoutes = new Router({ prefix: "/api/openrouter" });
protectedOpenRouterRoutes.use(authMiddleware);
protectedOpenRouterRoutes.use(openrouterRoutes.routes());
protectedOpenRouterRoutes.use(openrouterRoutes.allowedMethods());

app.use(protectedProjectRoutes.routes());
app.use(protectedProjectRoutes.allowedMethods());
app.use(protectedObjectiveRoutes.routes());
app.use(protectedObjectiveRoutes.allowedMethods());
app.use(protectedTaskRoutes.routes());
app.use(protectedTaskRoutes.allowedMethods());
app.use(protectedMessageRoutes.routes());
app.use(protectedMessageRoutes.allowedMethods());
app.use(protectedContentCardRoutes.routes());
app.use(protectedContentCardRoutes.allowedMethods());
app.use(protectedTagRoutes.routes());
app.use(protectedTagRoutes.allowedMethods());
app.use(protectedOpenRouterRoutes.routes());
app.use(protectedOpenRouterRoutes.allowedMethods());

// Use router for basic routes
app.use(router.routes());
app.use(router.allowedMethods());

// Static file serving for client - must come last
app.use(async (ctx, next) => {
  try {
    const filePath = ctx.request.url.pathname === "/" 
      ? "./src/client/index.html" 
      : `./src/client${ctx.request.url.pathname}`;
    
    const file = await Deno.readFile(filePath);
    
    // Set content type based on file extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon'
    };
    
    ctx.response.headers.set("Content-Type", contentTypes[ext || ''] || "text/plain");
    ctx.response.body = file;
  } catch {
    // If file not found, serve index.html for SPA routing
    try {
      const indexFile = await Deno.readFile("./src/client/index.html");
      ctx.response.headers.set("Content-Type", "text/html");
      ctx.response.body = indexFile;
    } catch {
      ctx.response.status = 404;
      ctx.response.body = "File not found";
    }
  }
});

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error("Server error:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
});

// Initialize database and start server
async function startServer() {
  const port = parseInt(Deno.env.get("PORT") || "8000");
  
  try {
    // Initialize database
    console.log("Initializing database...");
    initDatabase();
    
    if (!isDatabaseInitialized()) {
      console.log("Running database migrations...");
      await runMigrations();
    }
    
    console.log("Database ready");
    
    // Start server
    console.log(`🚀 Symposium server starting on http://localhost:${port}`);
    await app.listen({ port });
    
  } catch (error) {
    console.error("Failed to start server:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await startServer();
}
