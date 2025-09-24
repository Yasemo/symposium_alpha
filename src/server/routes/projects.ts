import { Router } from "oak";
import { getDatabase } from "../database/connection.ts";
import { requireAuth } from "../middleware/auth.ts";

const router = new Router();

// Get all projects for the authenticated user
router.get("/", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const db = getDatabase();
    
    const projects = db.prepare(`
      SELECT id, title, description, created_at, updated_at 
      FROM projects 
      WHERE user_id = ? 
      ORDER BY updated_at DESC
    `).all(user.id);
    
    ctx.response.body = projects;
  } catch (error) {
    console.error("Get projects error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch projects" };
  }
});

// Create a new project
router.post("/", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const body = await ctx.request.body({ type: "json" }).value;
    const { title, description } = body;

    if (!title) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Project title is required" };
      return;
    }

    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO projects (user_id, title, description) 
      VALUES (?, ?, ?) 
      RETURNING id, title, description, created_at, updated_at
    `).get(user.id, title, description || null);

    ctx.response.status = 201;
    ctx.response.body = result;
  } catch (error) {
    console.error("Create project error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to create project" };
  }
});

// Update a project
router.put("/:id", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const projectId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { title, description } = body;

    if (!title) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Project title is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if project belongs to user
    const existingProject = db.prepare(
      "SELECT id FROM projects WHERE id = ? AND user_id = ?"
    ).get(projectId, user.id);

    if (!existingProject) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Project not found" };
      return;
    }

    const result = db.prepare(`
      UPDATE projects 
      SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
      RETURNING id, title, description, created_at, updated_at
    `).get(title, description || null, projectId, user.id);

    ctx.response.body = result;
  } catch (error) {
    console.error("Update project error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to update project" };
  }
});

// Delete a project
router.delete("/:id", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const projectId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if project belongs to user
    const existingProject = db.prepare(
      "SELECT id FROM projects WHERE id = ? AND user_id = ?"
    ).get(projectId, user.id);

    if (!existingProject) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Project not found" };
      return;
    }

    // Delete project (cascade will handle related data)
    db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?")
      .run(projectId, user.id);

    ctx.response.body = { message: "Project deleted successfully" };
  } catch (error) {
    console.error("Delete project error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to delete project" };
  }
});

// Get objectives for a project
router.get("/:id/objectives", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const projectId = parseInt(ctx.params.id);

    const db = getDatabase();
    
    // Check if project belongs to user
    const project = db.prepare(
      "SELECT id FROM projects WHERE id = ? AND user_id = ?"
    ).get(projectId, user.id);

    if (!project) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Project not found" };
      return;
    }

    const objectives = db.prepare(`
      SELECT id, title, description, sequence_order, created_at, updated_at 
      FROM objectives 
      WHERE project_id = ? 
      ORDER BY sequence_order ASC, created_at ASC
    `).all(projectId);

    ctx.response.body = objectives;
  } catch (error) {
    console.error("Get objectives error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch objectives" };
  }
});

// Create objective for a project
router.post("/:id/objectives", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const projectId = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    const { title, description } = body;

    if (!title) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Objective title is required" };
      return;
    }

    const db = getDatabase();
    
    // Check if project belongs to user
    const project = db.prepare(
      "SELECT id FROM projects WHERE id = ? AND user_id = ?"
    ).get(projectId, user.id);

    if (!project) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Project not found" };
      return;
    }

    // Get next sequence order
    const maxOrder = db.prepare(
      "SELECT COALESCE(MAX(sequence_order), 0) as max_order FROM objectives WHERE project_id = ?"
    ).get(projectId) as { max_order: number };

    const result = db.prepare(`
      INSERT INTO objectives (project_id, title, description, sequence_order) 
      VALUES (?, ?, ?, ?) 
      RETURNING id, title, description, sequence_order, created_at, updated_at
    `).get(projectId, title, description || null, maxOrder.max_order + 1);

    ctx.response.status = 201;
    ctx.response.body = result;
  } catch (error) {
    console.error("Create objective error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to create objective" };
  }
});

// Generate project structure with LLM
router.post("/generate", async (ctx) => {
  try {
    const user = requireAuth(ctx);
    const body = await ctx.request.body({ type: "json" }).value;
    const { description, model = "openai/gpt-4" } = body;

    if (!description || !description.trim()) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Project description is required" };
      return;
    }

    if (!user.openrouter_api_key) {
      ctx.response.status = 400;
      ctx.response.body = { error: "OpenRouter API key is required for project generation" };
      return;
    }

    const { llmService } = await import("../services/llm-service.ts");
    
    // Generate project structure using LLM
    const projectStructure = await llmService.generateProjectStructure(
      user.openrouter_api_key,
      model,
      description.trim()
    );

    const db = getDatabase();
    
    // Start transaction
    db.exec("BEGIN TRANSACTION");

    try {
      // Create project
      const project = db.prepare(`
        INSERT INTO projects (user_id, title, description) 
        VALUES (?, ?, ?) 
        RETURNING id, title, description, created_at, updated_at
      `).get(user.id, projectStructure.title, projectStructure.description);

      const projectId = (project as any).id;

      // Create objectives and tasks
      for (let objIndex = 0; objIndex < projectStructure.objectives.length; objIndex++) {
        const objData = projectStructure.objectives[objIndex];
        
        const objective = db.prepare(`
          INSERT INTO objectives (project_id, title, description, sequence_order) 
          VALUES (?, ?, ?, ?) 
          RETURNING id
        `).get(projectId, objData.title, objData.description, objIndex + 1);

        const objectiveId = (objective as any).id;

        // Create tasks for this objective
        for (let taskIndex = 0; taskIndex < objData.tasks.length; taskIndex++) {
          const taskData = objData.tasks[taskIndex];
          
          db.prepare(`
            INSERT INTO tasks (objective_id, title, description, sequence_order) 
            VALUES (?, ?, ?, ?)
          `).run(objectiveId, taskData.title, taskData.description, taskIndex + 1);
        }
      }

      // Commit transaction
      db.exec("COMMIT");

      ctx.response.status = 201;
      ctx.response.body = {
        project,
        structure: projectStructure
      };

    } catch (dbError) {
      // Rollback transaction on error
      db.exec("ROLLBACK");
      throw dbError;
    }

  } catch (error) {
    console.error("Generate project error:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      error: "Failed to generate project", 
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
});

export default router;
