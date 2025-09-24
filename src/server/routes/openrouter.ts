import { Router } from "oak";
import { requireAuth } from "../middleware/auth.ts";

const router = new Router();

// Get available models from OpenRouter
router.get("/models", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    
    // Check if user has OpenRouter API key
    if (!user.openrouter_api_key) {
      ctx.response.status = 400;
      ctx.response.body = { error: "OpenRouter API key not configured" };
      return;
    }

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${user.openrouter_api_key}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter and format models for our UI
    const models = data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      description: model.description,
      pricing: model.pricing,
      context_length: model.context_length,
    }));

    ctx.response.body = models;
  } catch (error) {
    console.error("Get models error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch models" };
  }
});

// Get user's credit balance
router.get("/credits", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    
    // Check if user has OpenRouter API key
    if (!user.openrouter_api_key) {
      ctx.response.status = 400;
      ctx.response.body = { error: "OpenRouter API key not configured" };
      return;
    }

    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        "Authorization": `Bearer ${user.openrouter_api_key}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    
    ctx.response.body = {
      credits: data.data.credit_left,
      usage: data.data.usage,
    };
  } catch (error) {
    console.error("Get credits error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch credits" };
  }
});

export default router;
