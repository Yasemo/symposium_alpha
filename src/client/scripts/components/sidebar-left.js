// Left Sidebar Component for Symposium
class SidebarLeftComponent {
  constructor() {
    this.elements = {};
    this.init();
  }

  init() {
    this.initializeElements();
    this.setupEventListeners();
    this.setupStateSubscriptions();
  }

  initializeElements() {
    this.elements = {
      projectsList: document.getElementById('projects-list'),
      objectivesList: document.getElementById('objectives-list'),
      tasksList: document.getElementById('tasks-list'),
      newProjectBtn: document.getElementById('new-project-btn'),
      generateProjectBtn: document.getElementById('generate-project-btn'),
      newObjectiveBtn: document.getElementById('new-objective-btn'),
      newTaskBtn: document.getElementById('new-task-btn'),
    };
  }

  setupEventListeners() {
    // New item buttons
    this.elements.newProjectBtn.addEventListener('click', () => this.handleNewProject());
    this.elements.generateProjectBtn.addEventListener('click', () => this.handleGenerateProject());
    this.elements.newObjectiveBtn.addEventListener('click', () => this.handleNewObjective());
    this.elements.newTaskBtn.addEventListener('click', () => this.handleNewTask());
  }

  setupStateSubscriptions() {
    state.subscribe('projects', (projects) => this.renderProjects(projects));
    state.subscribe('objectives', (objectives) => this.renderObjectives(objectives));
    state.subscribe('tasks', (tasks) => this.renderTasks(tasks));
  }

  // Project rendering
  renderProjects(projects) {
    const container = this.elements.projectsList;
    container.innerHTML = '';

    if (projects.length === 0) {
      container.innerHTML = '<div class="empty-state">No projects yet. Create your first project!</div>';
      return;
    }

    projects.forEach(project => {
      const projectElement = document.createElement('div');
      projectElement.className = 'list-item';
      projectElement.dataset.projectId = project.id;
      
      if (state.getState('currentProject')?.id === project.id) {
        projectElement.classList.add('active');
      }

      projectElement.innerHTML = `
        <div class="list-item-title">${this.escapeHtml(project.title)}</div>
        ${project.description ? `<div class="list-item-description">${this.escapeHtml(project.description)}</div>` : ''}
      `;

      projectElement.addEventListener('click', () => this.selectProject(project));
      container.appendChild(projectElement);
    });
  }

  // Objective rendering
  renderObjectives(objectives) {
    const container = this.elements.objectivesList;
    container.innerHTML = '';

    if (!state.getState('currentProject')) {
      container.innerHTML = '<div class="empty-state">Select a project to view objectives</div>';
      return;
    }

    if (objectives.length === 0) {
      container.innerHTML = '<div class="empty-state">No objectives yet. Create your first objective!</div>';
      return;
    }

    objectives.forEach(objective => {
      const objectiveElement = document.createElement('div');
      objectiveElement.className = 'list-item';
      objectiveElement.dataset.objectiveId = objective.id;
      
      if (state.getState('currentObjective')?.id === objective.id) {
        objectiveElement.classList.add('active');
      }

      objectiveElement.innerHTML = `
        <div class="list-item-title">${this.escapeHtml(objective.title)}</div>
        ${objective.description ? `<div class="list-item-description">${this.escapeHtml(objective.description)}</div>` : ''}
      `;

      objectiveElement.addEventListener('click', () => this.selectObjective(objective));
      container.appendChild(objectiveElement);
    });
  }

  // Task rendering with drag & drop
  renderTasks(tasks) {
    const container = this.elements.tasksList;
    container.innerHTML = '';

    if (!state.getState('currentObjective')) {
      container.innerHTML = '<div class="empty-state">Select an objective to view tasks</div>';
      return;
    }

    if (tasks.length === 0) {
      container.innerHTML = '<div class="empty-state">No tasks yet. Create your first task!</div>';
      return;
    }

    // Register drop zone for task reordering
    dragDrop.registerDropZone(container, {
      id: 'tasks-drop-zone',
      accepts: ['task'],
      onDrop: (draggedData, dropTarget) => this.handleTaskReorder(draggedData, dropTarget)
    });

    tasks.forEach((task, index) => {
      const taskElement = document.createElement('div');
      taskElement.className = 'list-item task-item';
      taskElement.dataset.taskId = task.id;

      taskElement.innerHTML = `
        <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
        <input type="checkbox" class="task-checkbox" ${task.is_completed ? 'checked' : ''}>
        <span class="task-sequence">${index + 1}.</span>
        <div class="task-content">
          <div class="list-item-title ${task.is_completed ? 'completed' : ''}">${this.escapeHtml(task.title)}</div>
          ${task.description ? `<div class="list-item-description">${this.escapeHtml(task.description)}</div>` : ''}
        </div>
      `;

      // Make task draggable
      dragDrop.makeDraggable(taskElement, {
        type: 'task',
        id: task.id,
        currentIndex: index
      }, {
        handle: '.drag-handle'
      });

      const checkbox = taskElement.querySelector('.task-checkbox');
      checkbox.addEventListener('change', () => this.toggleTaskCompletion(task.id));

      container.appendChild(taskElement);
    });
  }

  // Creation handlers
  handleNewProject() {
    window.modalManager.showCreateModal('project', 'Create New Project', [
      { name: 'title', label: 'Project Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: false }
    ], async (data) => {
      try {
        const project = await api.createProject(data.title, data.description);
        state.addProject(project);
        notifications.success('Project created successfully!');
      } catch (error) {
        console.error('Failed to create project:', error);
        notifications.error('Failed to create project: ' + error.message);
      }
    });
  }

  async handleGenerateProject() {
    const currentUser = state.getUser();
    if (!currentUser?.openrouter_api_key) {
      notifications.error('Please add your OpenRouter API key first to generate projects with AI');
      return;
    }

    try {
      // Load available models from OpenRouter
      const models = await api.getModels();
      const modelOptions = models.map(model => ({
        value: model.id,
        label: `${model.name || model.id} ${model.pricing ? `($${model.pricing.prompt}/1K tokens)` : ''}`
      }));

      window.modalManager.showCreateModal('AI project', 'Generate Project with AI', [
        { name: 'description', label: 'Project Description', type: 'textarea', required: true, placeholder: 'Describe your project idea in detail...' },
        { name: 'model', label: 'AI Model', type: 'select', required: false, options: modelOptions, defaultValue: 'openai/gpt-4' }
      ], async (data) => {
        try {
          const loadingNotification = notifications.loading('Generating project with AI...');
          const response = await api.generateProject(data.description, data.model || 'openai/gpt-4');
          
          // Dismiss loading notification
          notifications.dismiss(loadingNotification);
          
          // Add the generated project to state
          state.addProject(response.project);
          
          // Auto-select the new project and load its objectives
          await this.selectProject(response.project);
          
          notifications.success(`Project "${response.project.title}" generated successfully with ${response.structure.objectives.length} objectives!`);
        } catch (error) {
          console.error('Failed to generate project:', error);
          notifications.error('Failed to generate project: ' + error.message);
        }
      });
    } catch (error) {
      console.error('Failed to load models:', error);
      notifications.error('Failed to load available models. Please check your API key.');
    }
  }

  handleNewObjective() {
    const currentProject = state.getState('currentProject');
    if (!currentProject) {
      notifications.error('Please select a project first');
      return;
    }

    window.modalManager.showCreateModal('objective', 'Create New Objective', [
      { name: 'title', label: 'Objective Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: false }
    ], async (data) => {
      try {
        const objective = await api.createObjective(currentProject.id, data.title, data.description);
        state.addObjective(objective);
        notifications.success('Objective created successfully!');
      } catch (error) {
        console.error('Failed to create objective:', error);
        notifications.error('Failed to create objective: ' + error.message);
      }
    });
  }

  handleNewTask() {
    const currentObjective = state.getState('currentObjective');
    if (!currentObjective) {
      notifications.error('Please select an objective first');
      return;
    }

    window.modalManager.showCreateModal('task', 'Create New Task', [
      { name: 'title', label: 'Task Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: false }
    ], async (data) => {
      try {
        const task = await api.createTask(currentObjective.id, data.title, data.description);
        state.addTask(task);
        notifications.success('Task created successfully!');
      } catch (error) {
        console.error('Failed to create task:', error);
        notifications.error('Failed to create task: ' + error.message);
      }
    });
  }

  // Selection methods
  async selectProject(project) {
    try {
      state.setCurrentProject(project);
      
      // Load objectives for this project
      const objectives = await api.getObjectives(project.id);
      state.setObjectives(objectives);
      
      // Clear current objective and tasks
      state.setCurrentObjective(null);
      state.setTasks([]);
      state.setMessages([]);
      
    } catch (error) {
      console.error('Failed to select project:', error);
      notifications.error('Failed to load project objectives');
    }
  }

  async selectObjective(objective) {
    try {
      state.setCurrentObjective(objective);
      
      // Load tasks and messages for this objective
      const [tasks, messages] = await Promise.all([
        api.getTasks(objective.id),
        api.getMessages(objective.id)
      ]);
      
      state.setTasks(tasks);
      state.setMessages(messages);
      
    } catch (error) {
      console.error('Failed to select objective:', error);
      notifications.error('Failed to load objective data');
    }
  }

  // Task completion toggle
  async toggleTaskCompletion(taskId) {
    try {
      const updatedTask = await api.toggleTaskCompletion(taskId);
      state.updateTask(updatedTask);
    } catch (error) {
      console.error('Failed to toggle task completion:', error);
      notifications.error('Failed to update task');
    }
  }

  // Task reordering with drag & drop
  async handleTaskReorder(draggedData, dropTarget) {
    try {
      const tasks = state.getState('tasks');
      const draggedTaskId = draggedData.id;
      const newIndex = dropTarget.index;
      
      // Find the dragged task
      const draggedTask = tasks.find(task => task.id === draggedTaskId);
      if (!draggedTask) return;
      
      // Create new task order
      const reorderedTasks = [...tasks];
      const oldIndex = reorderedTasks.findIndex(task => task.id === draggedTaskId);
      
      // Remove from old position and insert at new position
      reorderedTasks.splice(oldIndex, 1);
      reorderedTasks.splice(newIndex, 0, draggedTask);
      
      // Update sequence orders
      reorderedTasks.forEach((task, index) => {
        task.sequence_order = index + 1;
      });
      
      // Optimistically update UI
      state.setTasks(reorderedTasks);
      
      // Send reorder request to server
      await api.reorderTasks(state.getState('currentObjective').id, reorderedTasks.map(task => task.id));
      
      notifications.success('Tasks reordered successfully!');
      
    } catch (error) {
      console.error('Failed to reorder tasks:', error);
      notifications.error('Failed to reorder tasks: ' + error.message);
      
      // Reload tasks to restore original order
      const currentObjective = state.getState('currentObjective');
      if (currentObjective) {
        const tasks = await api.getTasks(currentObjective.id);
        state.setTasks(tasks);
      }
    }
  }

  // HTML escaping utility
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global sidebar left instance
window.sidebarLeft = new SidebarLeftComponent();
