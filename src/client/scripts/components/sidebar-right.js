// Right Sidebar Component for Symposium
class SidebarRightComponent {
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
      contentCards: document.getElementById('content-cards'),
      tagsList: document.getElementById('tags-list'),
      searchCards: document.getElementById('search-cards'),
      tagFilters: document.getElementById('tag-filters'),
      newCardBtn: document.getElementById('new-card-btn'),
      newTagBtn: document.getElementById('new-tag-btn'),
    };
  }

  setupEventListeners() {
    // New item buttons
    this.elements.newCardBtn.addEventListener('click', () => this.handleNewCard());
    this.elements.newTagBtn.addEventListener('click', () => this.handleNewTag());

    // Search functionality
    if (this.elements.searchCards) {
      this.elements.searchCards.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }
  }

  setupStateSubscriptions() {
    state.subscribe('contentCards', (cards) => this.renderContentCards(cards));
    state.subscribe('tags', (tags) => this.renderTags(tags));
    state.subscribe('activeTags', (activeTags) => this.updateActiveTags(activeTags));
  }

  renderContentCards(cards) {
    const container = this.elements.contentCards;
    container.innerHTML = '';

    if (cards.length === 0) {
      container.innerHTML = '<div class="empty-state">No content cards yet. Create your first card or convert a message!</div>';
      return;
    }

    // Apply search filter if active
    const searchTerm = this.elements.searchCards?.value?.toLowerCase() || '';
    const filteredCards = searchTerm ? 
      cards.filter(card => 
        card.title.toLowerCase().includes(searchTerm) || 
        card.content.toLowerCase().includes(searchTerm)
      ) : cards;

    if (filteredCards.length === 0 && searchTerm) {
      container.innerHTML = '<div class="empty-state">No cards match your search.</div>';
      return;
    }

    filteredCards.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.className = `content-card ${card.is_hidden ? 'hidden' : ''}`;
      cardElement.dataset.cardId = card.id;

      // Get tags for this card
      const cardTags = state.getState('tags').filter(tag => card.tags && card.tags.includes(tag.id));

      cardElement.innerHTML = `
        <div class="card-header">
          <div class="card-title">
            ${this.escapeHtml(card.title)}
            ${card.is_hidden ? '<span class="hidden-indicator" title="Hidden from prompts">🙈</span>' : ''}
          </div>
          <div class="card-actions">
            <button class="card-action-btn" onclick="sidebarRight.toggleCardVisibility(${card.id})" title="Toggle visibility">
              ${card.is_hidden ? '👁️ Show' : '🙈 Hide'}
            </button>
            <button class="card-action-btn" onclick="sidebarRight.editCard(${card.id})" title="Edit card">
              ✏️
            </button>
            <button class="card-action-btn" onclick="sidebarRight.deleteCard(${card.id})" title="Delete card">
              🗑️
            </button>
          </div>
        </div>
        <div class="card-content">${this.renderMarkdown(card.content)}</div>
        ${cardTags.length > 0 ? `
          <div class="card-tags">
            ${cardTags.map(tag => `
              <span class="tag" style="background-color: ${tag.color}">
                ${this.escapeHtml(tag.name)}
              </span>
            `).join('')}
          </div>
        ` : ''}
      `;

      container.appendChild(cardElement);
    });
  }

  renderTags(tags) {
    const container = this.elements.tagsList;
    container.innerHTML = '';

    if (tags.length === 0) {
      container.innerHTML = '<div class="empty-state">No tags yet. Create your first tag!</div>';
      return;
    }

    tags.forEach(tag => {
      const tagElement = document.createElement('div');
      tagElement.className = 'tag-filter';
      tagElement.dataset.tagId = tag.id;
      tagElement.style.borderColor = tag.color;

      // Check if tag is active
      const activeTags = state.getState('activeTags') || [];
      if (activeTags.includes(tag.id)) {
        tagElement.classList.add('active');
        tagElement.style.backgroundColor = tag.color;
      }

      tagElement.innerHTML = `
        ${this.escapeHtml(tag.name)}
        <button class="tag-remove" onclick="sidebarRight.removeTag(${tag.id})" title="Delete tag">×</button>
      `;

      tagElement.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tag-remove')) {
          this.toggleTag(tag.id);
        }
      });

      container.appendChild(tagElement);
    });

    // Also render tag filters
    this.renderTagFilters(tags);
  }

  renderTagFilters(tags) {
    if (!this.elements.tagFilters) return;

    const container = this.elements.tagFilters;
    container.innerHTML = '';

    if (tags.length === 0) return;

    tags.forEach(tag => {
      const filterElement = document.createElement('button');
      filterElement.className = 'tag-filter';
      filterElement.dataset.tagId = tag.id;
      filterElement.style.borderColor = tag.color;

      // Check if tag is active
      const activeTags = state.getState('activeTags') || [];
      if (activeTags.includes(tag.id)) {
        filterElement.classList.add('active');
        filterElement.style.backgroundColor = tag.color;
        filterElement.style.color = 'white';
      }

      filterElement.textContent = tag.name;
      filterElement.addEventListener('click', () => this.toggleTag(tag.id));

      container.appendChild(filterElement);
    });
  }

  updateActiveTags(activeTags) {
    // Update tag filter buttons
    const tagFilters = document.querySelectorAll('.tag-filter');
    tagFilters.forEach(filter => {
      const tagId = parseInt(filter.dataset.tagId);
      const tag = state.getState('tags').find(t => t.id === tagId);
      
      if (activeTags.includes(tagId)) {
        filter.classList.add('active');
        filter.style.backgroundColor = tag?.color || '#6366f1';
        filter.style.color = 'white';
      } else {
        filter.classList.remove('active');
        filter.style.backgroundColor = '';
        filter.style.color = '';
        filter.style.borderColor = tag?.color || '#6366f1';
      }
    });

    // Update active tags display in chat area
    this.renderActiveTags(activeTags);
  }

  renderActiveTags(activeTags) {
    const container = document.getElementById('active-tags');
    if (!container) return;

    container.innerHTML = '';

    if (activeTags.length === 0) {
      container.innerHTML = '<span class="no-tags">No tags selected</span>';
      return;
    }

    const tags = state.getState('tags');
    activeTags.forEach(tagId => {
      const tag = tags.find(t => t.id === tagId);
      if (!tag) return;

      const tagElement = document.createElement('span');
      tagElement.className = 'tag';
      tagElement.style.backgroundColor = tag.color;
      tagElement.innerHTML = `
        ${this.escapeHtml(tag.name)}
        <button class="tag-remove" onclick="sidebarRight.toggleTag(${tag.id})" title="Remove tag">×</button>
      `;

      container.appendChild(tagElement);
    });
  }

  handleNewCard() {
    window.modalManager.showCreateModal('content card', 'Create New Content Card', [
      { name: 'title', label: 'Card Title', type: 'text', required: true },
      { name: 'content', label: 'Content (Markdown)', type: 'textarea', required: true }
    ], async (data) => {
      try {
        const card = await api.createContentCard(data.title, data.content);
        state.addContentCard(card);
        notifications.success('Content card created successfully!');
      } catch (error) {
        console.error('Failed to create content card:', error);
        notifications.error('Failed to create content card: ' + error.message);
      }
    });
  }

  handleNewTag() {
    window.modalManager.showCreateModal('tag', 'Create New Tag', [
      { name: 'name', label: 'Tag Name', type: 'text', required: true },
      { name: 'color', label: 'Tag Color', type: 'color', required: false }
    ], async (data) => {
      try {
        const tag = await api.createTag(data.name, data.color || '#6366f1');
        state.addTag(tag);
        notifications.success('Tag created successfully!');
      } catch (error) {
        console.error('Failed to create tag:', error);
        notifications.error('Failed to create tag: ' + error.message);
      }
    });
  }

  handleSearch(searchTerm) {
    // Re-render cards with search filter
    const cards = state.getState('contentCards');
    this.renderContentCards(cards);
  }

  async toggleCardVisibility(cardId) {
    try {
      const updatedCard = await api.toggleCardVisibility(cardId);
      state.updateContentCard(updatedCard);
    } catch (error) {
      console.error('Failed to toggle card visibility:', error);
      notifications.error('Failed to update card visibility');
    }
  }

  async editCard(cardId) {
    const card = state.getState('contentCards').find(c => c.id === cardId);
    if (!card) return;

    window.modalManager.showCreateModal('content card', 'Edit Content Card', [
      { name: 'title', label: 'Card Title', type: 'text', required: true, defaultValue: card.title },
      { name: 'content', label: 'Content (Markdown)', type: 'textarea', required: true, defaultValue: card.content }
    ], async (data) => {
      try {
        const updatedCard = await api.updateContentCard(cardId, data.title, data.content);
        state.updateContentCard(updatedCard);
        notifications.success('Content card updated successfully!');
      } catch (error) {
        console.error('Failed to update content card:', error);
        notifications.error('Failed to update content card: ' + error.message);
      }
    });
  }

  async deleteCard(cardId) {
    const confirmed = await window.modalManager.confirm(
      'Delete Content Card',
      'Are you sure you want to permanently delete this content card?'
    );

    if (!confirmed) return;

    try {
      await api.deleteContentCard(cardId);
      state.removeContentCard(cardId);
      notifications.success('Content card deleted successfully');
    } catch (error) {
      console.error('Failed to delete card:', error);
      notifications.error('Failed to delete card');
    }
  }

  toggleTag(tagId) {
    const activeTags = state.getState('activeTags') || [];
    const isActive = activeTags.includes(tagId);
    
    if (isActive) {
      state.setActiveTags(activeTags.filter(id => id !== tagId));
    } else {
      state.setActiveTags([...activeTags, tagId]);
    }
  }

  async removeTag(tagId) {
    const confirmed = await window.modalManager.confirm(
      'Delete Tag',
      'Are you sure you want to permanently delete this tag? It will be removed from all content cards.'
    );

    if (!confirmed) return;

    try {
      await api.deleteTag(tagId);
      state.removeTag(tagId);
      notifications.success('Tag deleted successfully');
    } catch (error) {
      console.error('Failed to delete tag:', error);
      notifications.error('Failed to delete tag');
    }
  }

  // Simple markdown rendering (basic implementation)
  renderMarkdown(text) {
    // Basic markdown rendering - could be enhanced with a proper markdown library
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  // HTML escaping utility
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global sidebar right instance
window.sidebarRight = new SidebarRightComponent();
