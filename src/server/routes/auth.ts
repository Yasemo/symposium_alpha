import { Router } from "oak";
import { hash, compare } from "bcrypt";
import { create, getNumericDate } from "djwt";
import { getDatabase } from "../database/connection.ts";

const router = new Router();

// JWT secret key - same as in auth middleware
const JWT_SECRET = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode("your-secret-key-change-in-production"),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"]
);

// Helper function to create JWT token
async function createToken(userId: number): Promise<string> {
  const payload = {
    sub: userId.toString(),
    iat: getNumericDate(new Date()),
    exp: getNumericDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
  };
  
  return await create({ alg: "HS256", typ: "JWT" }, payload, JWT_SECRET);
}

// Register endpoint
router.post("/register", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Email and password are required" };
      return;
    }

    if (password.length < 6) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Password must be at least 6 characters long" };
      return;
    }

    // Check if user already exists
    const db = getDatabase();
    const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    
    if (existingUser) {
      ctx.response.status = 409;
      ctx.response.body = { error: "User with this email already exists" };
      return;
    }

    // Hash password
    const passwordHash = await hash(password);

    // Create user
    const result = db.prepare(
      "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email"
    ).get(email, passwordHash);

    if (!result) {
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to create user" };
      return;
    }

    const user = result as { id: number; email: string };

    // Create JWT token
    const token = await createToken(user.id);

    ctx.response.status = 201;
    ctx.response.body = {
      message: "User created successfully",
      user: { id: user.id, email: user.email },
      token
    };

  } catch (error) {
    console.error("Registration error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Login endpoint
router.post("/login", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Email and password are required" };
      return;
    }

    // Get user from database
    const db = getDatabase();
    const user = db.prepare(
      "SELECT id, email, password_hash FROM users WHERE email = ?"
    ).get(email) as { id: number; email: string; password_hash: string } | undefined;

    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid email or password" };
      return;
    }

    // Verify password
    const isValidPassword = await compare(password, user.password_hash);
    
    if (!isValidPassword) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid email or password" };
      return;
    }

    // Create JWT token
    const token = await createToken(user.id);

    ctx.response.body = {
      message: "Login successful",
      user: { id: user.id, email: user.email },
      token
    };

  } catch (error) {
    console.error("Login error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Get current user endpoint (requires authentication)
router.get("/me", async (ctx) => {
  try {
    // This endpoint will be protected by auth middleware
    const user = ctx.state.user;
    
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Not authenticated" };
      return;
    }

    ctx.response.body = {
      user: { id: user.id, email: user.email }
    };

  } catch (error) {
    console.error("Get user error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Logout endpoint (client-side token removal, server doesn't need to do anything)
router.post("/logout", (ctx) => {
  ctx.response.body = { message: "Logout successful" };
});

export default router;
