import { Router } from "oak";
import { getDatabase } from "../database/connection.ts";
import { requireAuth } from "../middleware/auth.ts";

const router = new Router();

// Toggle message visibility
router.put("/:id/hide", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const messageId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if message belongs to user (through project)
    const message = db.prepare(`
      SELECT m.id, m.is_hidden FROM messages m
      JOIN objectives o ON m.objective_id = o.id
      JOIN projects p ON o.project_id = p.id
      WHERE m.id = ? AND p.user_id = ?
    `).get(messageId, user.id) as { id: number; is_hidden: boolean } | undefined;

    if (!message) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Message not found" };
      return;
    }

    // Toggle visibility
    const newVisibility = !message.is_hidden;
    const result = db.prepare(`
      UPDATE messages 
      SET is_hidden = ? 
      WHERE id = ?
      RETURNING id, objective_id, role, content, is_hidden, model_used, consultant_type, created_at
    `).get(newVisibility, messageId);

    ctx.response.body = result;
  } catch (error) {
    console.error("Toggle message visibility error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to toggle message visibility" };
  }
});

// Delete message permanently
router.delete("/:id", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const messageId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if message belongs to user (through project)
    const message = db.prepare(`
      SELECT m.id FROM messages m
      JOIN objectives o ON m.objective_id = o.id
      JOIN projects p ON o.project_id = p.id
      WHERE m.id = ? AND p.user_id = ?
    `).get(messageId, user.id);

    if (!message) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Message not found" };
      return;
    }

    // Delete message
    db.prepare("DELETE FROM messages WHERE id = ?").run(messageId);

    ctx.response.body = { message: "Message deleted successfully" };
  } catch (error) {
    console.error("Delete message error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to delete message" };
  }
});

// Convert message to content card
router.post("/:id/to-card", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const messageId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { title } = body;

    if (!title || !title.trim()) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Card title is required" };
      return;
    }

    const db = getDatabase();
    
    // Get message content and verify ownership
    const message = db.prepare(`
      SELECT m.id, m.content FROM messages m
      JOIN objectives o ON m.objective_id = o.id
      JOIN projects p ON o.project_id = p.id
      WHERE m.id = ? AND p.user_id = ?
    `).get(messageId, user.id) as { id: number; content: string } | undefined;

    if (!message) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Message not found" };
      return;
    }

    // Create content card (starts hidden by default)
    const result = db.prepare(`
      INSERT INTO content_cards (user_id, title, content, is_hidden) 
      VALUES (?, ?, ?, TRUE) 
      RETURNING id, title, content, is_hidden, created_at, updated_at
    `).get(user.id, title.trim(), message.content);

    ctx.response.status = 201;
    ctx.response.body = result;
  } catch (error) {
    console.error("Convert message to card error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to convert message to card" };
  }
});

export default router;
