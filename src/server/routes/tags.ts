import { Router } from "oak";
import { getDatabase } from "../database/connection.ts";
import { requireAuth } from "../middleware/auth.ts";

const router = new Router();

// Get all tags for the user
router.get("/", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const db = getDatabase();
    
    const tags = db.prepare(`
      SELECT id, name, color, created_at 
      FROM tags 
      WHERE user_id = ? 
      ORDER BY name ASC
    `).all(user.id);
    
    ctx.response.body = tags;
  } catch (error) {
    console.error("Get tags error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch tags" };
  }
});

// Create a new tag
router.post("/", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const body = await ctx.request.body({ type: "json" }).value;
    const { name, color } = body;

    if (!name || !name.trim()) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Tag name is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if tag name already exists for this user
    const existingTag = db.prepare(
      "SELECT id FROM tags WHERE user_id = ? AND name = ?"
    ).get(user.id, name.trim());

    if (existingTag) {
      ctx.response.status = 409;
      ctx.response.body = { error: "Tag with this name already exists" };
      return;
    }

    // Create tag with default color if not provided
    const tagColor = color || '#6366f1'; // Default indigo color
    
    const result = db.prepare(`
      INSERT INTO tags (user_id, name, color) 
      VALUES (?, ?, ?) 
      RETURNING id, name, color, created_at
    `).get(user.id, name.trim(), tagColor);

    ctx.response.status = 201;
    ctx.response.body = result;
  } catch (error) {
    console.error("Create tag error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to create tag" };
  }
});

// Update a tag
router.put("/:id", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const tagId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { name, color } = body;

    if (!name || !name.trim()) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Tag name is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if tag belongs to user
    const existingTag = db.prepare(
      "SELECT id FROM tags WHERE id = ? AND user_id = ?"
    ).get(tagId, user.id);

    if (!existingTag) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Tag not found" };
      return;
    }

    // Check if new name conflicts with existing tag (excluding current tag)
    const conflictingTag = db.prepare(
      "SELECT id FROM tags WHERE user_id = ? AND name = ? AND id != ?"
    ).get(user.id, name.trim(), tagId);

    if (conflictingTag) {
      ctx.response.status = 409;
      ctx.response.body = { error: "Tag with this name already exists" };
      return;
    }

    const result = db.prepare(`
      UPDATE tags 
      SET name = ?, color = ? 
      WHERE id = ? AND user_id = ?
      RETURNING id, name, color, created_at
    `).get(name.trim(), color || '#6366f1', tagId, user.id);

    ctx.response.body = result;
  } catch (error) {
    console.error("Update tag error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to update tag" };
  }
});

// Delete a tag
router.delete("/:id", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const tagId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if tag belongs to user
    const existingTag = db.prepare(
      "SELECT id FROM tags WHERE id = ? AND user_id = ?"
    ).get(tagId, user.id);

    if (!existingTag) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Tag not found" };
      return;
    }

    // Delete tag (cascade will handle content_card_tags and objective_active_tags)
    db.prepare("DELETE FROM tags WHERE id = ? AND user_id = ?")
      .run(tagId, user.id);

    ctx.response.body = { message: "Tag deleted successfully" };
  } catch (error) {
    console.error("Delete tag error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to delete tag" };
  }
});

export default router;
