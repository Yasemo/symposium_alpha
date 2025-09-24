import { Router } from "oak";
import { getDatabase } from "../database/connection.ts";
import { requireAuth } from "../middleware/auth.ts";

const router = new Router();

// Update a task
router.put("/:id", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const taskId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { title, description } = body;

    if (!title) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Task title is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if task belongs to user (through project)
    const existingTask = db.prepare(`
      SELECT t.id FROM tasks t
      JOIN objectives o ON t.objective_id = o.id
      JOIN projects p ON o.project_id = p.id
      WHERE t.id = ? AND p.user_id = ?
    `).get(taskId, user.id);

    if (!existingTask) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Task not found" };
      return;
    }

    const result = db.prepare(`
      UPDATE tasks 
      SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
      RETURNING id, objective_id, title, description, sequence_order, is_completed, created_at, updated_at
    `).get(title, description || null, taskId);

    ctx.response.body = result;
  } catch (error) {
    console.error("Update task error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to update task" };
  }
});

// Delete a task
router.delete("/:id", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const taskId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if task belongs to user (through project)
    const existingTask = db.prepare(`
      SELECT t.id FROM tasks t
      JOIN objectives o ON t.objective_id = o.id
      JOIN projects p ON o.project_id = p.id
      WHERE t.id = ? AND p.user_id = ?
    `).get(taskId, user.id);

    if (!existingTask) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Task not found" };
      return;
    }

    // Delete task
    db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);

    ctx.response.body = { message: "Task deleted successfully" };
  } catch (error) {
    console.error("Delete task error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to delete task" };
  }
});

// Toggle task completion
router.put("/:id/complete", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const taskId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if task belongs to user and get current completion status
    const task = db.prepare(`
      SELECT t.id, t.is_completed FROM tasks t
      JOIN objectives o ON t.objective_id = o.id
      JOIN projects p ON o.project_id = p.id
      WHERE t.id = ? AND p.user_id = ?
    `).get(taskId, user.id) as { id: number; is_completed: boolean } | undefined;

    if (!task) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Task not found" };
      return;
    }

    // Toggle completion status
    const newStatus = !task.is_completed;
    const result = db.prepare(`
      UPDATE tasks 
      SET is_completed = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
      RETURNING id, objective_id, title, description, sequence_order, is_completed, created_at, updated_at
    `).get(newStatus, taskId);

    ctx.response.body = result;
  } catch (error) {
    console.error("Toggle task completion error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to toggle task completion" };
  }
});

// Reorder tasks within an objective
router.put("/:id/reorder", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const taskId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { newOrder } = body;

    if (typeof newOrder !== 'number' || newOrder < 1) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Valid new order is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if task belongs to user and get objective_id
    const task = db.prepare(`
      SELECT t.id, t.objective_id, t.sequence_order FROM tasks t
      JOIN objectives o ON t.objective_id = o.id
      JOIN projects p ON o.project_id = p.id
      WHERE t.id = ? AND p.user_id = ?
    `).get(taskId, user.id) as { id: number; objective_id: number; sequence_order: number } | undefined;

    if (!task) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Task not found" };
      return;
    }

    const oldOrder = task.sequence_order;
    
    // Update sequence orders
    if (newOrder > oldOrder) {
      // Moving down: decrease order of items between old and new position
      db.prepare(`
        UPDATE tasks 
        SET sequence_order = sequence_order - 1 
        WHERE objective_id = ? AND sequence_order > ? AND sequence_order <= ?
      `).run(task.objective_id, oldOrder, newOrder);
    } else if (newOrder < oldOrder) {
      // Moving up: increase order of items between new and old position
      db.prepare(`
        UPDATE tasks 
        SET sequence_order = sequence_order + 1 
        WHERE objective_id = ? AND sequence_order >= ? AND sequence_order < ?
      `).run(task.objective_id, newOrder, oldOrder);
    }

    // Update the moved task
    const result = db.prepare(`
      UPDATE tasks 
      SET sequence_order = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
      RETURNING id, objective_id, title, description, sequence_order, is_completed, created_at, updated_at
    `).get(newOrder, taskId);

    ctx.response.body = result;
  } catch (error) {
    console.error("Reorder task error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to reorder task" };
  }
});

export default router;
