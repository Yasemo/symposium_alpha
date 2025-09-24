import { Router } from "oak";
import { getDatabase } from "../database/connection.ts";
import { requireAuth } from "../middleware/auth.ts";

const router = new Router();

// Get all content cards for the user
router.get("/", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const db = getDatabase();
    
    const cards = db.prepare(`
      SELECT cc.id, cc.title, cc.content, cc.is_hidden, cc.created_at, cc.updated_at,
             GROUP_CONCAT(cct.tag_id) as tag_ids
      FROM content_cards cc
      LEFT JOIN content_card_tags cct ON cc.id = cct.content_card_id
      WHERE cc.user_id = ?
      GROUP BY cc.id
      ORDER BY cc.updated_at DESC
    `).all(user.id);

    // Parse tag_ids into arrays
    const cardsWithTags = cards.map((card: any) => ({
      ...card,
      tags: card.tag_ids ? card.tag_ids.split(',').map((id: string) => parseInt(id)) : []
    }));

    ctx.response.body = cardsWithTags;
  } catch (error) {
    console.error("Get content cards error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch content cards" };
  }
});

// Create a new content card
router.post("/", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const body = await ctx.request.body({ type: "json" }).value;
    const { title, content, tags = [] } = body;

    if (!title || !title.trim()) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Card title is required" };
      return;
    }

    if (!content || !content.trim()) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Card content is required" };
      return;
    }

    const db = getDatabase();
    
    // Create content card (starts hidden by default)
    const result = db.prepare(`
      INSERT INTO content_cards (user_id, title, content, is_hidden) 
      VALUES (?, ?, ?, TRUE) 
      RETURNING id, title, content, is_hidden, created_at, updated_at
    `).get(user.id, title.trim(), content.trim());

    const cardId = (result as any).id;

    // Add tags if provided
    if (tags.length > 0) {
      const tagInsert = db.prepare("INSERT INTO content_card_tags (content_card_id, tag_id) VALUES (?, ?)");
      for (const tagId of tags) {
        tagInsert.run(cardId, tagId);
      }
    }

    // Return card with tags
    ctx.response.status = 201;
    ctx.response.body = { ...result, tags };
  } catch (error) {
    console.error("Create content card error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to create content card" };
  }
});

// Update a content card
router.put("/:id", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const cardId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { title, content, tags = [] } = body;

    if (!title || !title.trim()) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Card title is required" };
      return;
    }

    if (!content || !content.trim()) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Card content is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if card belongs to user
    const existingCard = db.prepare(
      "SELECT id FROM content_cards WHERE id = ? AND user_id = ?"
    ).get(cardId, user.id);

    if (!existingCard) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Content card not found" };
      return;
    }

    // Update card
    const result = db.prepare(`
      UPDATE content_cards 
      SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
      RETURNING id, title, content, is_hidden, created_at, updated_at
    `).get(title.trim(), content.trim(), cardId, user.id);

    // Update tags
    db.prepare("DELETE FROM content_card_tags WHERE content_card_id = ?").run(cardId);
    
    if (tags.length > 0) {
      const tagInsert = db.prepare("INSERT INTO content_card_tags (content_card_id, tag_id) VALUES (?, ?)");
      for (const tagId of tags) {
        tagInsert.run(cardId, tagId);
      }
    }

    ctx.response.body = { ...result, tags };
  } catch (error) {
    console.error("Update content card error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to update content card" };
  }
});

// Toggle card visibility
router.put("/:id/hide", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const cardId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if card belongs to user and get current visibility
    const card = db.prepare(
      "SELECT id, is_hidden FROM content_cards WHERE id = ? AND user_id = ?"
    ).get(cardId, user.id) as { id: number; is_hidden: boolean } | undefined;

    if (!card) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Content card not found" };
      return;
    }

    // Toggle visibility
    const newVisibility = !card.is_hidden;
    const result = db.prepare(`
      UPDATE content_cards 
      SET is_hidden = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
      RETURNING id, title, content, is_hidden, created_at, updated_at
    `).get(newVisibility, cardId, user.id);

    ctx.response.body = result;
  } catch (error) {
    console.error("Toggle card visibility error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to toggle card visibility" };
  }
});

// Delete a content card
router.delete("/:id", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const cardId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if card belongs to user
    const existingCard = db.prepare(
      "SELECT id FROM content_cards WHERE id = ? AND user_id = ?"
    ).get(cardId, user.id);

    if (!existingCard) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Content card not found" };
      return;
    }

    // Delete card (cascade will handle tags)
    db.prepare("DELETE FROM content_cards WHERE id = ? AND user_id = ?")
      .run(cardId, user.id);

    ctx.response.body = { message: "Content card deleted successfully" };
  } catch (error) {
    console.error("Delete content card error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to delete content card" };
  }
});

// Add tags to a content card
router.post("/:id/tags", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const cardId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { tagIds } = body;

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Tag IDs array is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if card belongs to user
    const card = db.prepare(
      "SELECT id FROM content_cards WHERE id = ? AND user_id = ?"
    ).get(cardId, user.id);

    if (!card) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Content card not found" };
      return;
    }

    // Add tags (ignore duplicates)
    const tagInsert = db.prepare(`
      INSERT OR IGNORE INTO content_card_tags (content_card_id, tag_id) 
      VALUES (?, ?)
    `);
    
    for (const tagId of tagIds) {
      tagInsert.run(cardId, tagId);
    }

    ctx.response.body = { message: "Tags added successfully" };
  } catch (error) {
    console.error("Add tags to card error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to add tags to card" };
  }
});

// Remove tag from a content card
router.delete("/:cardId/tags/:tagId", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const cardId = parseInt(ctx.params.cardId);
    const tagId = parseInt(ctx.params.tagId);

    const db = getDatabase();
    
    // Check if card belongs to user
    const card = db.prepare(
      "SELECT id FROM content_cards WHERE id = ? AND user_id = ?"
    ).get(cardId, user.id);

    if (!card) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Content card not found" };
      return;
    }

    // Remove tag
    db.prepare("DELETE FROM content_card_tags WHERE content_card_id = ? AND tag_id = ?")
      .run(cardId, tagId);

    ctx.response.body = { message: "Tag removed successfully" };
  } catch (error) {
    console.error("Remove tag from card error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to remove tag from card" };
  }
});

export default router;
