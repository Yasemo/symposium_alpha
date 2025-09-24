import { promptBuilder } from "./prompt-builder.ts";

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LLMService {
  async generateResponse(
    apiKey: string,
    model: string,
    userId: number,
    objectiveId: number,
    userMessage: string,
    selectedTags: number[] = []
  ): Promise<LLMResponse> {
    try {
      // Build the global system prompt with full context
      const systemPrompt = await promptBuilder.buildGlobalSystemPrompt(
        userId,
        objectiveId,
        selectedTags,
        userMessage
      );

      // Prepare the OpenRouter API request
      const requestBody = {
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: userMessage
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      };

      console.log(`Making LLM request to model: ${model}`);
      console.log(`System prompt length: ${systemPrompt.length} characters`);

      // Make request to OpenRouter
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://symposium.app", // Optional: for analytics
          "X-Title": "Symposium" // Optional: for analytics
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response generated from LLM');
      }

      const assistantMessage = data.choices[0].message?.content;
      if (!assistantMessage) {
        throw new Error('Empty response from LLM');
      }

      return {
        content: assistantMessage.trim(),
        model: model,
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens || 0,
          completion_tokens: data.usage.completion_tokens || 0,
          total_tokens: data.usage.total_tokens || 0
        } : undefined
      };

    } catch (error) {
      console.error('LLM service error:', error);
      throw error;
    }
  }

  async generateProjectStructure(
    apiKey: string,
    model: string,
    projectDescription: string
  ): Promise<{
    title: string;
    description: string;
    objectives: Array<{
      title: string;
      description: string;
      tasks: Array<{
        title: string;
        description: string;
      }>;
    }>;
  }> {
    try {
      const systemPrompt = `You are an AI assistant specialized in project planning and structure generation.

Your task is to analyze a project description and generate a well-structured project breakdown with:
1. A clear project title
2. A refined project description
3. 3-5 main objectives that break down the project into logical phases
4. 3-7 specific, actionable tasks for each objective

Return your response as a JSON object with this exact structure:
{
  "title": "Project Title",
  "description": "Refined project description",
  "objectives": [
    {
      "title": "Objective Title",
      "description": "Objective description",
      "tasks": [
        {
          "title": "Task Title",
          "description": "Task description"
        }
      ]
    }
  ]
}

Make sure the objectives are sequential and logical, and the tasks are specific and actionable.`;

      const requestBody = {
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Please generate a structured project breakdown for: ${projectDescription}`
          }
        ],
        max_tokens: 3000,
        temperature: 0.3, // Lower temperature for more structured output
        top_p: 0.9
      };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://symposium.app",
          "X-Title": "Symposium"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message?.content;

      if (!assistantMessage) {
        throw new Error('Empty response from LLM');
      }

      // Try to parse the JSON response
      try {
        const projectStructure = JSON.parse(assistantMessage.trim());
        
        // Validate the structure
        if (!projectStructure.title || !projectStructure.objectives || !Array.isArray(projectStructure.objectives)) {
          throw new Error('Invalid project structure format');
        }

        return projectStructure;
      } catch (parseError) {
        console.error('Failed to parse LLM response as JSON:', assistantMessage);
        throw new Error('Failed to parse project structure from LLM response');
      }

    } catch (error) {
      console.error('Project generation error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const llmService = new LLMService();
