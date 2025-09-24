// API Service for Symposium
class ApiService {
  constructor() {
    this.baseUrl = '';
    this.token = localStorage.getItem('symposium_token');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('symposium_token', token);
    } else {
      localStorage.removeItem('symposium_token');
    }
  }

  // Get authentication headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async register(email, password) {
    const data = await this.request('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }

  async login(email, password) {
    const data = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }

  async logout() {
    await this.request('/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getCurrentUser() {
    return await this.request('/me');
  }

  // Project methods
  async getProjects() {
    return await this.request('/api/projects');
  }

  async createProject(title, description) {
    return await this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  }

  async updateProject(id, title, description) {
    return await this.request(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description }),
    });
  }

  async deleteProject(id) {
    return await this.request(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async generateProject(description, model = 'openai/gpt-4') {
    return await this.request('/api/projects/generate', {
      method: 'POST',
      body: JSON.stringify({ description, model }),
    });
  }

  // Objective methods
  async getObjectives(projectId) {
    return await this.request(`/api/projects/${projectId}/objectives`);
  }

  async createObjective(projectId, title, description) {
    return await this.request(`/api/projects/${projectId}/objectives`, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  }

  async updateObjective(id, title, description) {
    return await this.request(`/api/objectives/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description }),
    });
  }

  async deleteObjective(id) {
    return await this.request(`/api/objectives/${id}`, {
      method: 'DELETE',
    });
  }

  // Task methods
  async getTasks(objectiveId) {
    return await this.request(`/api/objectives/${objectiveId}/tasks`);
  }

  async createTask(objectiveId, title, description) {
    return await this.request(`/api/objectives/${objectiveId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  }

  async updateTask(id, title, description) {
    return await this.request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description }),
    });
  }

  async toggleTaskCompletion(id) {
    return await this.request(`/api/tasks/${id}/complete`, {
      method: 'PUT',
    });
  }

  async deleteTask(id) {
    return await this.request(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderTasks(objectiveId, taskIds) {
    return await this.request(`/api/objectives/${objectiveId}/tasks/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ taskIds }),
    });
  }

  // Message methods
  async getMessages(objectiveId) {
    return await this.request(`/api/objectives/${objectiveId}/messages`);
  }

  async sendMessage(objectiveId, content, selectedTags = [], model = 'openai/gpt-5') {
    return await this.request(`/api/objectives/${objectiveId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, selectedTags, model }),
    });
  }

  async toggleMessageVisibility(messageId) {
    return await this.request(`/api/messages/${messageId}/hide`, {
      method: 'PUT',
    });
  }

  async deleteMessage(messageId) {
    return await this.request(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async convertMessageToCard(messageId, title) {
    return await this.request(`/api/messages/${messageId}/to-card`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  // Knowledge base methods
  async getContentCards() {
    return await this.request('/api/content-cards');
  }

  async createContentCard(title, content, tags = []) {
    return await this.request('/api/content-cards', {
      method: 'POST',
      body: JSON.stringify({ title, content, tags }),
    });
  }

  async updateContentCard(id, title, content, tags = []) {
    return await this.request(`/api/content-cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content, tags }),
    });
  }

  async toggleCardVisibility(id) {
    return await this.request(`/api/content-cards/${id}/hide`, {
      method: 'PUT',
    });
  }

  async deleteContentCard(id) {
    return await this.request(`/api/content-cards/${id}`, {
      method: 'DELETE',
    });
  }

  // Tag methods
  async getTags() {
    return await this.request('/api/tags');
  }

  async createTag(name, color) {
    return await this.request('/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
  }

  async updateTag(id, name, color) {
    return await this.request(`/api/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, color }),
    });
  }

  async deleteTag(id) {
    return await this.request(`/api/tags/${id}`, {
      method: 'DELETE',
    });
  }

  // OpenRouter methods
  async getModels() {
    return await this.request('/api/openrouter/models');
  }

  async getCredits() {
    return await this.request('/api/openrouter/credits');
  }

  // User management methods
  async updateApiKey(apiKey) {
    return await this.request('/api/user/api-key', {
      method: 'PUT',
      body: JSON.stringify({ apiKey }),
    });
  }
}

// Create global API instance
window.api = new ApiService();
