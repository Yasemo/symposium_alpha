// Modal Component for Symposium
class ModalManager {
  constructor() {
    this.currentModal = null;
  }

  showCreateModal(type, title, fields, onSubmit) {
    // Remove existing modal if any
    this.hideModal();

    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'create-modal';

    const fieldsHtml = fields.map(field => {
      let inputHtml;
      
      if (field.type === 'textarea') {
        inputHtml = `<textarea id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''} ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}></textarea>`;
      } else if (field.type === 'select') {
        const options = field.options || [];
        const optionsHtml = options.map(option => 
          `<option value="${option.value}" ${field.defaultValue === option.value ? 'selected' : ''}>${option.label}</option>`
        ).join('');
        inputHtml = `<select id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''}>${optionsHtml}</select>`;
      } else {
        inputHtml = `<input type="${field.type}" id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''} ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}>`;
      }
      
      return `
        <div class="form-group">
          <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
          ${inputHtml}
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div class="modal-content">
        <h2>${title}</h2>
        <form id="create-form">
          ${fieldsHtml}
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Create ${type}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    this.currentModal = modal;

    // Add event listeners
    const form = modal.querySelector('#create-form');
    const cancelBtn = modal.querySelector('#cancel-btn');

    cancelBtn.addEventListener('click', () => this.hideModal());
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideModal();
      }
    });

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.hideModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = {};
      
      for (const [key, value] of formData.entries()) {
        data[key] = value.trim();
      }

      // Validate required fields
      const missingFields = fields.filter(field => field.required && !data[field.name]);
      if (missingFields.length > 0) {
        notifications.error(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
        return;
      }

      try {
        await onSubmit(data);
        this.hideModal();
      } catch (error) {
        // Error is handled in the onSubmit callback
      }
    });

    // Focus first input
    const firstInput = modal.querySelector('input, textarea, select');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  showConfirmModal(title, message, onConfirm, onCancel = null) {
    // Remove existing modal if any
    this.hideModal();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'confirm-modal';

    modal.innerHTML = `
      <div class="modal-content">
        <h2>${title}</h2>
        <p>${message}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirm-btn">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.currentModal = modal;

    const confirmBtn = modal.querySelector('#confirm-btn');
    const cancelBtn = modal.querySelector('#cancel-btn');

    confirmBtn.addEventListener('click', () => {
      onConfirm();
      this.hideModal();
    });

    cancelBtn.addEventListener('click', () => {
      if (onCancel) onCancel();
      this.hideModal();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (onCancel) onCancel();
        this.hideModal();
      }
    });

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
        this.hideModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Focus confirm button
    setTimeout(() => confirmBtn.focus(), 100);
  }

  showInfoModal(title, message, onClose = null) {
    // Remove existing modal if any
    this.hideModal();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'info-modal';

    modal.innerHTML = `
      <div class="modal-content">
        <h2>${title}</h2>
        <div class="modal-body">${message}</div>
        <div class="form-actions">
          <button type="button" class="btn btn-primary" id="close-btn">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.currentModal = modal;

    const closeBtn = modal.querySelector('#close-btn');

    closeBtn.addEventListener('click', () => {
      if (onClose) onClose();
      this.hideModal();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (onClose) onClose();
        this.hideModal();
      }
    });

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
        this.hideModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Focus close button
    setTimeout(() => closeBtn.focus(), 100);
  }

  hideModal() {
    if (this.currentModal) {
      // Add fade out animation
      this.currentModal.style.opacity = '0';
      
      setTimeout(() => {
        if (this.currentModal && this.currentModal.parentNode) {
          this.currentModal.parentNode.removeChild(this.currentModal);
        }
        this.currentModal = null;
      }, 200);
    }

    // Remove any existing modals
    const existingModals = document.querySelectorAll('.modal');
    existingModals.forEach(modal => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    });
  }

  isModalOpen() {
    return this.currentModal !== null;
  }

  // Utility method for prompting user input
  async prompt(title, message, defaultValue = '', inputType = 'text') {
    return new Promise((resolve) => {
      this.showCreateModal('input', title, [
        {
          name: 'value',
          label: message,
          type: inputType,
          required: true,
          placeholder: defaultValue
        }
      ], (data) => {
        resolve(data.value);
      });
    });
  }

  // Utility method for confirmation dialogs
  async confirm(title, message) {
    return new Promise((resolve) => {
      this.showConfirmModal(title, message, 
        () => resolve(true),
        () => resolve(false)
      );
    });
  }

  // Support for default values in form fields
  setFieldDefaults(fields) {
    fields.forEach(field => {
      if (field.defaultValue) {
        const element = document.getElementById(field.name);
        if (element) {
          element.value = field.defaultValue;
        }
      }
    });
  }
}

// Create global modal manager instance
window.modalManager = new ModalManager();
