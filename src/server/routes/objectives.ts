import { Router } from "oak";
import { getDatabase } from "../database/connection.ts";
import { requireAuth } from "../middleware/auth.ts";

const router = new Router();

// Update an objective
router.put("/:id", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const objectiveId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { title, description } = body;

    if (!title) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Objective title is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if objective belongs to user (through project)
    const existingObjective = db.prepare(`
      SELECT o.id FROM objectives o
      JOIN projects p ON o.project_id = p.id
      WHERE o.id = ? AND p.user_id = ?
    `).get(objectiveId, user.id);

    if (!existingObjective) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Objective not found" };
      return;
    }

    const result = db.prepare(`
      UPDATE objectives 
      SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
      RETURNING id, project_id, title, description, sequence_order, created_at, updated_at
    `).get(title, description || null, objectiveId);

    ctx.response.body = result;
  } catch (error) {
    console.error("Update objective error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to update objective" };
  }
});

// Delete an objective
router.delete("/:id", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const objectiveId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if objective belongs to user (through project)
    const existingObjective = db.prepare(`
      SELECT o.id FROM objectives o
      JOIN projects p ON o.project_id = p.id
      WHERE o.id = ? AND p.user_id = ?
    `).get(objectiveId, user.id);

    if (!existingObjective) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Objective not found" };
      return;
    }

    // Delete objective (cascade will handle related data)
    db.prepare("DELETE FROM objectives WHERE id = ?").run(objectiveId);

    ctx.response.body = { message: "Objective deleted successfully" };
  } catch (error) {
    console.error("Delete objective error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to delete objective" };
  }
});

// Reorder objectives
router.put("/:id/reorder", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const objectiveId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { newOrder } = body;

    if (typeof newOrder !== 'number' || newOrder < 1) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Valid new order is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if objective belongs to user and get project_id
    const objective = db.prepare(`
      SELECT o.id, o.project_id, o.sequence_order FROM objectives o
      JOIN projects p ON o.project_id = p.id
      WHERE o.id = ? AND p.user_id = ?
    `).get(objectiveId, user.id) as { id: number; project_id: number; sequence_order: number } | undefined;

    if (!objective) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Objective not found" };
      return;
    }

    const oldOrder = objective.sequence_order;
    
    // Update sequence orders
    if (newOrder > oldOrder) {
      // Moving down: decrease order of items between old and new position
      db.prepare(`
        UPDATE objectives 
        SET sequence_order = sequence_order - 1 
        WHERE project_id = ? AND sequence_order > ? AND sequence_order <= ?
      `).run(objective.project_id, oldOrder, newOrder);
    } else if (newOrder < oldOrder) {
      // Moving up: increase order of items between new and old position
      db.prepare(`
        UPDATE objectives 
        SET sequence_order = sequence_order + 1 
        WHERE project_id = ? AND sequence_order >= ? AND sequence_order < ?
      `).run(objective.project_id, newOrder, oldOrder);
    }

    // Update the moved objective
    const result = db.prepare(`
      UPDATE objectives 
      SET sequence_order = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
      RETURNING id, project_id, title, description, sequence_order, created_at, updated_at
    `).get(newOrder, objectiveId);

    ctx.response.body = result;
  } catch (error) {
    console.error("Reorder objective error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to reorder objective" };
  }
});

// Get tasks for an objective
router.get("/:id/tasks", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const objectiveId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if objective belongs to user (through project)
    const objective = db.prepare(`
      SELECT o.id FROM objectives o
      JOIN projects p ON o.project_id = p.id
      WHERE o.id = ? AND p.user_id = ?
    `).get(objectiveId, user.id);

    if (!objective) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Objective not found" };
      return;
    }

    const tasks = db.prepare(`
      SELECT id, title, description, sequence_order, is_completed, created_at, updated_at 
      FROM tasks 
      WHERE objective_id = ? 
      ORDER BY sequence_order ASC, created_at ASC
    `).all(objectiveId);

    ctx.response.body = tasks;
  } catch (error) {
    console.error("Get tasks error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch tasks" };
  }
});

// Create task for an objective
router.post("/:id/tasks", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const objectiveId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { title, description } = body;

    if (!title) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Task title is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if objective belongs to user (through project)
    const objective = db.prepare(`
      SELECT o.id FROM objectives o
      JOIN projects p ON o.project_id = p.id
      WHERE o.id = ? AND p.user_id = ?
    `).get(objectiveId, user.id);

    if (!objective) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Objective not found" };
      return;
    }

    // Get next sequence order
    const maxOrder = db.prepare(
      "SELECT COALESCE(MAX(sequence_order), 0) as max_order FROM tasks WHERE objective_id = ?"
    ).get(objectiveId) as { max_order: number };

    const result = db.prepare(`
      INSERT INTO tasks (objective_id, title, description, sequence_order) 
      VALUES (?, ?, ?, ?) 
      RETURNING id, title, description, sequence_order, is_completed, created_at, updated_at
    `).get(objectiveId, title, description || null, maxOrder.max_order + 1);

    ctx.response.status = 201;
    ctx.response.body = result;
  } catch (error) {
    console.error("Create task error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to create task" };
  }
});

// Get messages for an objective
router.get("/:id/messages", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const objectiveId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if objective belongs to user (through project)
    const objective = db.prepare(`
      SELECT o.id FROM objectives o
      JOIN projects p ON o.project_id = p.id
      WHERE o.id = ? AND p.user_id = ?
    `).get(objectiveId, user.id);

    if (!objective) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Objective not found" };
      return;
    }

    const messages = db.prepare(`
      SELECT id, role, content, is_hidden, model_used, consultant_type, created_at 
      FROM messages 
      WHERE objective_id = ? 
      ORDER BY created_at ASC
    `).all(objectiveId);

    ctx.response.body = messages;
  } catch (error) {
    console.error("Get messages error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch messages" };
  }
});

// Send message to an objective
router.post("/:id/messages", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const objectiveId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { content, selectedTags = [], model = "openai/gpt-5" } = body;

    if (!content || !content.trim()) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Message content is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if objective belongs to user (through project)
    const objective = db.prepare(`
      SELECT o.id FROM objectives o
      JOIN projects p ON o.project_id = p.id
      WHERE o.id = ? AND p.user_id = ?
    `).get(objectiveId, user.id);

    if (!objective) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Objective not found" };
      return;
    }

    // Save user message
    const userMessage = db.prepare(`
      INSERT INTO messages (objective_id, role, content) 
      VALUES (?, 'user', ?) 
      RETURNING id, role, content, is_hidden, model_used, consultant_type, created_at
    `).get(objectiveId, content.trim());

    // Generate AI response if user has OpenRouter API key
    let assistantMessage = null;
    if (user.openrouter_api_key) {
      try {
        const { llmService } = await import("../services/llm-service.ts");
        
        const llmResponse = await llmService.generateResponse(
          user.openrouter_api_key,
          model,
          user.id,
          objectiveId,
          content.trim(),
          selectedTags
        );

        // Save assistant message
        assistantMessage = db.prepare(`
          INSERT INTO messages (objective_id, role, content, model_used) 
          VALUES (?, 'assistant', ?, ?) 
          RETURNING id, role, content, is_hidden, model_used, consultant_type, created_at
        `).get(objectiveId, llmResponse.content, llmResponse.model);

      } catch (llmError) {
        console.error("LLM generation error:", llmError);
        // Save error message as assistant response
        const errorMessage = llmError instanceof Error ? llmError.message : 'Unknown error';
        assistantMessage = db.prepare(`
          INSERT INTO messages (objective_id, role, content, model_used) 
          VALUES (?, 'assistant', ?, ?) 
          RETURNING id, role, content, is_hidden, model_used, consultant_type, created_at
        `).get(objectiveId, `Sorry, I encountered an error generating a response: ${errorMessage}`, model);
      }
    }

    // Return both messages
    ctx.response.status = 201;
    ctx.response.body = {
      userMessage,
      assistantMessage
    };
  } catch (error) {
    console.error("Send message error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to send message" };
  }
});

export default router;
