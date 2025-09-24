import { getDatabase } from "../database/connection.ts";

export interface GlobalSystemPromptContext {
  project: { title: string; description: string };
  objective: { title: string; description: string };
  tasks: Array<{ title: string; description: string; sequence: number; completed: boolean }>;
  chatHistory: Array<{ role: 'user' | 'assistant' | 'consultant'; content: string }>;
  contentCards: Array<{ title: string; content: string }>;
  userMessage: string;
}

export class PromptBuilder {
  private db;

  constructor() {
    this.db = getDatabase();
  }

  async buildGlobalSystemPrompt(
    userId: number,
    objectiveId: number,
    selectedTags: number[] = [],
    userMessage: string
  ): Promise<string> {
    try {
      // Get objective with project info
      const objective = this.db.prepare(`
        SELECT o.id, o.title as objective_title, o.description as objective_description,
               p.title as project_title, p.description as project_description
        FROM objectives o
        JOIN projects p ON o.project_id = p.id
        WHERE o.id = ? AND p.user_id = ?
      `).get(objectiveId, userId) as any;

      if (!objective) {
        throw new Error('Objective not found');
      }

      // Get tasks for this objective
      const tasks = this.db.prepare(`
        SELECT title, description, sequence_order, is_completed
        FROM tasks
        WHERE objective_id = ?
        ORDER BY sequence_order ASC
      `).all(objectiveId) as any[];

      // Get chat history for this objective (excluding hidden messages)
      const chatHistory = this.db.prepare(`
        SELECT role, content
        FROM messages
        WHERE objective_id = ? AND is_hidden = FALSE
        ORDER BY created_at ASC
      `).all(objectiveId) as any[];

      // Get content cards based on selected tags
      let contentCards: any[] = [];
      
      if (selectedTags.length > 0) {
        // Get cards that have any of the selected tags OR are visible (not hidden)
        const placeholders = selectedTags.map(() => '?').join(',');
        contentCards = this.db.prepare(`
          SELECT DISTINCT cc.title, cc.content
          FROM content_cards cc
          LEFT JOIN content_card_tags cct ON cc.id = cct.content_card_id
          WHERE cc.user_id = ? AND (
            cc.is_hidden = FALSE OR 
            cct.tag_id IN (${placeholders})
          )
          ORDER BY cc.updated_at DESC
        `).all(userId, ...selectedTags) as any[];
      } else {
        // Only get visible cards if no tags selected
        contentCards = this.db.prepare(`
          SELECT title, content
          FROM content_cards
          WHERE user_id = ? AND is_hidden = FALSE
          ORDER BY updated_at DESC
        `).all(userId) as any[];
      }

      // Build the context object
      const context: GlobalSystemPromptContext = {
        project: {
          title: objective.project_title,
          description: objective.project_description || ''
        },
        objective: {
          title: objective.objective_title,
          description: objective.objective_description || ''
        },
        tasks: tasks.map((task, index) => ({
          title: task.title,
          description: task.description || '',
          sequence: index + 1,
          completed: Boolean(task.is_completed)
        })),
        chatHistory: chatHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'consultant',
          content: msg.content
        })),
        contentCards: contentCards.map(card => ({
          title: card.title,
          content: card.content
        })),
        userMessage
      };

      return this.constructPrompt(context);
    } catch (error) {
      console.error('Error building global system prompt:', error);
      throw error;
    }
  }

  private constructPrompt(context: GlobalSystemPromptContext): string {
    const sections: string[] = [];

    // System role and instructions
    sections.push(`You are an AI assistant helping with project management and ideation in the Symposium application.

Your role is to provide helpful, contextual responses based on the current project, objective, and available knowledge base content.

Be concise but thorough, and always consider the full context provided below when formulating your response.`);

    // Project context
    sections.push(`## Current Project Context

**Project:** ${context.project.title}
${context.project.description ? `**Description:** ${context.project.description}` : ''}

**Current Objective:** ${context.objective.title}
${context.objective.description ? `**Objective Description:** ${context.objective.description}` : ''}`);

    // Task sequence
    if (context.tasks.length > 0) {
      sections.push(`## Task Sequence

The following tasks are associated with this objective:`);
      
      context.tasks.forEach(task => {
        const status = task.completed ? '✅ COMPLETED' : '⏳ PENDING';
        sections.push(`${task.sequence}. **${task.title}** - ${status}`);
        if (task.description) {
          sections.push(`   ${task.description}`);
        }
      });
    }

    // Knowledge base content
    if (context.contentCards.length > 0) {
      sections.push(`## Relevant Knowledge Base Content

The following content cards are available for context:`);
      
      context.contentCards.forEach(card => {
        sections.push(`### ${card.title}

${card.content}

---`);
      });
    }

    // Chat history
    if (context.chatHistory.length > 0) {
      sections.push(`## Previous Conversation

Here is the conversation history for this objective:`);
      
      context.chatHistory.forEach(msg => {
        const roleLabel = msg.role === 'user' ? 'User' : 
                         msg.role === 'assistant' ? 'Assistant' : 'Consultant';
        sections.push(`**${roleLabel}:** ${msg.content}`);
      });
    }

    // Current user message
    sections.push(`## Current User Message

**User:** ${context.userMessage}

---

Please provide a helpful response based on all the context above. Consider the project goals, current objective, task progress, available knowledge, and conversation history when formulating your answer.`);

    return sections.join('\n\n');
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilder();
