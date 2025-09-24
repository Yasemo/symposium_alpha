// Main Application Entry Point - Lightweight Coordinator for modular components
class SymposiumApp {
  constructor() {
    this.initialized = false;
    this.components = {};
    this.init();
  }

  async init() {
    try {
      // Initialize UI elements first
      this.initializeElements();
      
      // Show loading
      this.showLoading(true);
      
      // Set up event listeners for app-level functionality
      this.setupEventListeners();
      
      // Initialize components (they're already created as globals)
      this.initializeComponents();
      
      // Check for existing authentication
      await this.checkAuthentication();
      
      // Initialize the app based on auth status
      if (state.getUser()) {
        await this.initializeAuthenticatedApp();
      } else {
        this.showLoginModal();
      }

      this.initialized = true;
      this.showLoading(false);

    } catch (error) {
      console.error('Failed to initialize app:', error);
      notifications.error('Failed to initialize application');
      if (this.elements && this.elements.loading) {
        this.showLoading(false);
      }
    }
  }

  initializeComponents() {
    // Reference the global component instances
    this.components = {
      chatArea: window.chatArea,
      modalManager: window.modalManager,
      sidebarLeft: window.sidebarLeft,
      sidebarRight: window.sidebarRight,
      notifications: window.notifications,
      dragDrop: window.dragDrop
    };
  }

  initializeElements() {
    // Get references to key DOM elements for app-level functionality only
    this.elements = {
      // Modals
      loginModal: document.getElementById('login-modal'),
      loginForm: document.getElementById('login-form'),
      registerBtn: document.getElementById('register-btn'),
      
      // Header
      userEmail: document.getElementById('user-email'),
      logoutBtn: document.getElementById('logout-btn'),
      
      // Loading
      loading: document.getElementById('loading'),
    };
  }

  setupEventListeners() {
    // Login form
    this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.elements.registerBtn.addEventListener('click', () => this.handleRegister());
    
    // Logout
    this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());

    // State subscriptions for app-level functionality only
    state.subscribe('user', (user) => this.updateUserDisplay(user));
    state.subscribe('loading', (loading) => this.showLoading(loading));
  }

  async checkAuthentication() {
    const token = localStorage.getItem('symposium_token');
    if (token) {
      try {
        api.setToken(token);
        const response = await api.getCurrentUser();
        state.setUser(response.user);
        console.log('User authenticated:', response.user.email);
      } catch (error) {
        console.log('Invalid token, clearing authentication');
        // Clear invalid token
        localStorage.removeItem('symposium_token');
        api.setToken(null);
      }
    } else {
      console.log('No authentication token found');
    }
  }

  async initializeAuthenticatedApp() {
    try {
      // Load initial data
      await Promise.all([
        this.loadProjects(),
        this.loadTags(),
        this.loadContentCards(),
      ]);
      
      this.hideLoginModal();
      
      // Load credits if API key is available
      const user = state.getUser();
      if (user?.openrouter_api_key && this.components.chatArea) {
        await this.components.chatArea.loadCredits();
      }
      
    } catch (error) {
      console.error('Failed to initialize authenticated app:', error);
      notifications.error('Failed to load application data');
    }
  }

  // Authentication handlers
  async handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      state.setLoading(true);
      const response = await api.login(email, password);
      state.setUser(response.user);
      await this.initializeAuthenticatedApp();
    } catch (error) {
      console.error('Login failed:', error);
      notifications.error(error.message || 'Login failed');
    } finally {
      state.setLoading(false);
    }
  }

  async handleRegister() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
      notifications.error('Please enter email and password');
      return;
    }

    try {
      state.setLoading(true);
      const response = await api.register(email, password);
      state.setUser(response.user);
      await this.initializeAuthenticatedApp();
    } catch (error) {
      console.error('Registration failed:', error);
      notifications.error(error.message || 'Registration failed');
    } finally {
      state.setLoading(false);
    }
  }

  async handleLogout() {
    try {
      await api.logout();
      state.clearUser();
      this.showLoginModal();
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state anyway
      state.clearUser();
      this.showLoginModal();
    }
  }

  // Data loading methods - app-level coordination only
  async loadProjects() {
    try {
      const projects = await api.getProjects();
      state.setProjects(projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      notifications.error('Failed to load projects');
    }
  }

  async loadTags() {
    try {
      const tags = await api.getTags();
      state.setTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
      notifications.error('Failed to load tags');
    }
  }

  async loadContentCards() {
    try {
      const cards = await api.getContentCards();
      state.setContentCards(cards);
    } catch (error) {
      console.error('Failed to load content cards:', error);
      notifications.error('Failed to load content cards');
    }
  }

  // UI update methods - app-level only
  updateUserDisplay(user) {
    if (user) {
      this.elements.userEmail.textContent = user.email;
    } else {
      this.elements.userEmail.textContent = '';
    }
  }

  // UI utility methods - app-level only
  showLoginModal() {
    this.elements.loginModal.classList.remove('hidden');
  }

  hideLoginModal() {
    this.elements.loginModal.classList.add('hidden');
  }

  showLoading(show) {
    if (show) {
      this.elements.loading.classList.remove('hidden');
    } else {
      this.elements.loading.classList.add('hidden');
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SymposiumApp();
});
