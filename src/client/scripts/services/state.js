// State Management for Symposium
class StateManager {
  constructor() {
    this.state = {
      user: null,
      projects: [],
      currentProject: null,
      objectives: [],
      currentObjective: null,
      tasks: [],
      messages: [],
      contentCards: [],
      tags: [],
      activeTags: [],
      models: [],
      credits: null,
      loading: false,
    };
    
    this.listeners = {};
  }

  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
    };
  }

  // Notify listeners of state changes
  notify(key, value) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => callback(value));
    }
  }

  // Update state
  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Notify listeners for each changed key
    Object.keys(updates).forEach(key => {
      if (oldState[key] !== this.state[key]) {
        this.notify(key, this.state[key]);
      }
    });
  }

  // Get current state
  getState(key) {
    return key ? this.state[key] : this.state;
  }

  // User management
  setUser(user) {
    this.setState({ user });
  }

  getUser() {
    return this.state.user;
  }

  clearUser() {
    this.setState({ 
      user: null,
      projects: [],
      currentProject: null,
      objectives: [],
      currentObjective: null,
      tasks: [],
      messages: [],
    });
  }

  // Project management
  setProjects(projects) {
    this.setState({ projects });
  }

  addProject(project) {
    this.setState({ 
      projects: [...this.state.projects, project] 
    });
  }

  updateProject(updatedProject) {
    this.setState({
      projects: this.state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      ),
      currentProject: this.state.currentProject?.id === updatedProject.id 
        ? updatedProject 
        : this.state.currentProject
    });
  }

  removeProject(projectId) {
    this.setState({
      projects: this.state.projects.filter(p => p.id !== projectId),
      currentProject: this.state.currentProject?.id === projectId 
        ? null 
        : this.state.currentProject,
      objectives: this.state.currentProject?.id === projectId ? [] : this.state.objectives,
      currentObjective: this.state.currentProject?.id === projectId ? null : this.state.currentObjective,
      tasks: this.state.currentProject?.id === projectId ? [] : this.state.tasks,
      messages: this.state.currentProject?.id === projectId ? [] : this.state.messages,
    });
  }

  setCurrentProject(project) {
    this.setState({ 
      currentProject: project,
      objectives: [],
      currentObjective: null,
      tasks: [],
      messages: [],
    });
  }

  // Objective management
  setObjectives(objectives) {
    this.setState({ objectives });
  }

  addObjective(objective) {
    this.setState({ 
      objectives: [...this.state.objectives, objective] 
    });
  }

  updateObjective(updatedObjective) {
    this.setState({
      objectives: this.state.objectives.map(o => 
        o.id === updatedObjective.id ? updatedObjective : o
      ),
      currentObjective: this.state.currentObjective?.id === updatedObjective.id 
        ? updatedObjective 
        : this.state.currentObjective
    });
  }

  removeObjective(objectiveId) {
    this.setState({
      objectives: this.state.objectives.filter(o => o.id !== objectiveId),
      currentObjective: this.state.currentObjective?.id === objectiveId 
        ? null 
        : this.state.currentObjective,
      tasks: this.state.currentObjective?.id === objectiveId ? [] : this.state.tasks,
      messages: this.state.currentObjective?.id === objectiveId ? [] : this.state.messages,
    });
  }

  setCurrentObjective(objective) {
    this.setState({ 
      currentObjective: objective,
      tasks: [],
      messages: [],
    });
  }

  // Task management
  setTasks(tasks) {
    this.setState({ tasks });
  }

  addTask(task) {
    this.setState({ 
      tasks: [...this.state.tasks, task] 
    });
  }

  updateTask(updatedTask) {
    this.setState({
      tasks: this.state.tasks.map(t => 
        t.id === updatedTask.id ? updatedTask : t
      )
    });
  }

  removeTask(taskId) {
    this.setState({
      tasks: this.state.tasks.filter(t => t.id !== taskId)
    });
  }

  // Message management
  setMessages(messages) {
    this.setState({ messages });
  }

  addMessage(message) {
    this.setState({ 
      messages: [...this.state.messages, message] 
    });
  }

  updateMessage(updatedMessage) {
    this.setState({
      messages: this.state.messages.map(m => 
        m.id === updatedMessage.id ? updatedMessage : m
      )
    });
  }

  removeMessage(messageId) {
    this.setState({
      messages: this.state.messages.filter(m => m.id !== messageId)
    });
  }

  // Knowledge base management
  setContentCards(contentCards) {
    this.setState({ contentCards });
  }

  addContentCard(card) {
    this.setState({ 
      contentCards: [...this.state.contentCards, card] 
    });
  }

  updateContentCard(updatedCard) {
    this.setState({
      contentCards: this.state.contentCards.map(c => 
        c.id === updatedCard.id ? updatedCard : c
      )
    });
  }

  removeContentCard(cardId) {
    this.setState({
      contentCards: this.state.contentCards.filter(c => c.id !== cardId)
    });
  }

  // Tag management
  setTags(tags) {
    this.setState({ tags });
  }

  addTag(tag) {
    this.setState({ 
      tags: [...this.state.tags, tag] 
    });
  }

  updateTag(updatedTag) {
    this.setState({
      tags: this.state.tags.map(t => 
        t.id === updatedTag.id ? updatedTag : t
      )
    });
  }

  removeTag(tagId) {
    this.setState({
      tags: this.state.tags.filter(t => t.id !== tagId),
      activeTags: this.state.activeTags.filter(id => id !== tagId)
    });
  }

  setActiveTags(tagIds) {
    this.setState({ activeTags: tagIds });
  }

  toggleActiveTag(tagId) {
    const activeTags = this.state.activeTags.includes(tagId)
      ? this.state.activeTags.filter(id => id !== tagId)
      : [...this.state.activeTags, tagId];
    
    this.setState({ activeTags });
  }

  // OpenRouter management
  setModels(models) {
    this.setState({ models });
  }

  setCredits(credits) {
    this.setState({ credits });
  }

  // Loading state
  setLoading(loading) {
    this.setState({ loading });
  }

  // Utility methods
  getProjectById(id) {
    return this.state.projects.find(p => p.id === id);
  }

  getObjectiveById(id) {
    return this.state.objectives.find(o => o.id === id);
  }

  getTaskById(id) {
    return this.state.tasks.find(t => t.id === id);
  }

  getTagById(id) {
    return this.state.tags.find(t => t.id === id);
  }

  getActiveTagsData() {
    return this.state.activeTags.map(id => this.getTagById(id)).filter(Boolean);
  }

  // Filter content cards by active tags
  getFilteredContentCards() {
    if (this.state.activeTags.length === 0) {
      return this.state.contentCards;
    }
    
    return this.state.contentCards.filter(card => 
      card.tags && card.tags.some(tagId => this.state.activeTags.includes(tagId))
    );
  }
}

// Create global state instance
window.state = new StateManager();
