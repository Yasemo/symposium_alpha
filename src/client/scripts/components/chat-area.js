// Chat Area Component for Symposium
class ChatAreaComponent {
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
      currentObjective: document.getElementById('current-objective'),
      messagesContainer: document.getElementById('messages-container'),
      messageInput: document.getElementById('message-input'),
      sendBtn: document.getElementById('send-btn'),
      activeTags: document.getElementById('active-tags'),
      modelSelector: document.getElementById('model-selector'),
      creditDisplay: document.getElementById('credit-display'),
      creditAmount: document.getElementById('credit-amount'),
      apiKeyBtn: document.getElementById('api-key-btn'),
    };
  }

  setupEventListeners() {
    // Send message
    this.elements.sendBtn.addEventListener('click', () => this.handleSendMessage());
    this.elements.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    // API Key management
    this.elements.apiKeyBtn.addEventListener('click', () => this.handleApiKeyManagement());
  }

  setupStateSubscriptions() {
    state.subscribe('currentObjective', (objective) => this.updateCurrentObjective(objective));
    state.subscribe('messages', (messages) => this.renderMessages(messages));
  }

  updateCurrentObjective(objective) {
    if (objective) {
      this.elements.currentObjective.textContent = objective.title;
    } else {
      this.elements.currentObjective.textContent = 'Select an objective to start chatting';
    }
  }

  renderMessages(messages) {
    const container = this.elements.messagesContainer;
    container.innerHTML = '';

    if (!state.getState('currentObjective')) {
      container.innerHTML = '<div class="empty-state">Select an objective to start chatting</div>';
      return;
    }

    if (messages.length === 0) {
      container.innerHTML = '<div class="empty-state">No messages yet. Start a conversation!</div>';
      return;
    }

    messages.forEach(message => {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${message.role}`;
      messageElement.dataset.messageId = message.id;

      const timeString = new Date(message.created_at).toLocaleTimeString();
      
      messageElement.innerHTML = `
        <div class="message-content">${this.escapeHtml(message.content)}</div>
        <div class="message-meta">
          <span class="message-time">${timeString}</span>
          ${message.model_used ? `<span class="message-model">${message.model_used}</span>` : ''}
          ${message.consultant_type ? `<span class="message-consultant">${message.consultant_type}</span>` : ''}
          <div class="message-actions">
            <button class="message-action-btn" onclick="chatArea.toggleMessageVisibility(${message.id})" title="Toggle visibility">
              ${message.is_hidden ? '👁️' : '🙈'}
            </button>
            <button class="message-action-btn" onclick="chatArea.deleteMessage(${message.id})" title="Delete message">
              🗑️
            </button>
            ${message.role !== 'user' ? `<button class="message-action-btn" onclick="chatArea.convertMessageToCard(${message.id})" title="Convert to card">📋</button>` : ''}
          </div>
        </div>
      `;

      if (message.is_hidden) {
        messageElement.classList.add('hidden-message');
      }

      container.appendChild(messageElement);
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  async handleSendMessage() {
    const content = this.elements.messageInput.value.trim();
    if (!content) return;

    const currentObjective = state.getState('currentObjective');
    if (!currentObjective) {
      notifications.error('Please select an objective first');
      return;
    }

    try {
      // Clear input immediately for better UX
      this.elements.messageInput.value = '';
      
      // Send message to API with selected model
      const selectedModel = this.elements.modelSelector?.value || 'openai/gpt-4';
      const response = await api.sendMessage(
        currentObjective.id, 
        content, 
        state.getState('activeTags') || [],
        selectedModel
      );
      
      // Add user message to state
      if (response.userMessage) {
        state.addMessage(response.userMessage);
      }
      
      // Add assistant message to state if generated
      if (response.assistantMessage) {
        state.addMessage(response.assistantMessage);
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      notifications.error('Failed to send message: ' + error.message);
      // Restore message content on error
      this.elements.messageInput.value = content;
    }
  }

  async toggleMessageVisibility(messageId) {
    try {
      const updatedMessage = await api.toggleMessageVisibility(messageId);
      state.updateMessage(updatedMessage);
    } catch (error) {
      console.error('Failed to toggle message visibility:', error);
      notifications.error('Failed to update message visibility');
    }
  }

  async deleteMessage(messageId) {
    if (!confirm('Are you sure you want to permanently delete this message?')) {
      return;
    }

    try {
      await api.deleteMessage(messageId);
      state.removeMessage(messageId);
      notifications.success('Message deleted successfully');
    } catch (error) {
      console.error('Failed to delete message:', error);
      notifications.error('Failed to delete message');
    }
  }

  async convertMessageToCard(messageId) {
    const title = prompt('Enter a title for this content card:');
    if (!title || !title.trim()) {
      return;
    }

    try {
      const card = await api.convertMessageToCard(messageId, title.trim());
      state.addContentCard(card);
      notifications.success('Message converted to content card successfully');
    } catch (error) {
      console.error('Failed to convert message to card:', error);
      notifications.error('Failed to convert message to card');
    }
  }

  handleApiKeyManagement() {
    const currentUser = state.getUser();
    const currentKey = currentUser?.openrouter_api_key || '';
    
    window.modalManager.showCreateModal('API key', 'Manage OpenRouter API Key', [
      { 
        name: 'apiKey', 
        label: 'OpenRouter API Key', 
        type: 'password', 
        required: false,
        placeholder: currentKey ? '••••••••••••••••' : 'Enter your OpenRouter API key'
      }
    ], async (data) => {
      try {
        if (data.apiKey && data.apiKey.trim()) {
          await api.updateApiKey(data.apiKey.trim());
          notifications.success('API key updated successfully!');
          await this.loadCredits();
        } else if (currentKey) {
          // Clear API key
          await api.updateApiKey('');
          notifications.success('API key removed successfully!');
          this.elements.creditAmount.textContent = 'Credits: --';
        }
      } catch (error) {
        console.error('Failed to update API key:', error);
        notifications.error('Failed to update API key: ' + error.message);
      }
    });
  }

  async loadCredits() {
    try {
      const credits = await api.getCredits();
      this.elements.creditAmount.textContent = `Credits: $${credits.credits.toFixed(2)}`;
    } catch (error) {
      console.error('Failed to load credits:', error);
      this.elements.creditAmount.textContent = 'Credits: Error';
    }
  }

  // HTML escaping utility
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global chat area instance
window.chatArea = new ChatAreaComponent();
