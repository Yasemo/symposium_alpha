// Notification System for Symposium
class NotificationManager {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.init();
  }

  init() {
    // Create notification container
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 5000) {
    const id = Date.now() + Math.random();
    const notification = this.createNotification(id, message, type, duration);
    
    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  createNotification(id, message, type, duration) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.dataset.id = id;

    const icon = this.getIcon(type);
    const progressBar = duration > 0 ? '<div class="notification-progress"></div>' : '';

    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">${icon}</div>
        <div class="notification-message">${this.escapeHtml(message)}</div>
        <button class="notification-close" onclick="notifications.dismiss(${id})">×</button>
      </div>
      ${progressBar}
    `;

    // Start progress animation
    if (duration > 0) {
      const progressElement = notification.querySelector('.notification-progress');
      if (progressElement) {
        progressElement.style.animationDuration = `${duration}ms`;
      }
    }

    return notification;
  }

  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳'
    };
    return icons[type] || icons.info;
  }

  dismiss(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.classList.add('hide');
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);
  }

  success(message, duration = 4000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 6000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 5000) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 4000) {
    return this.show(message, 'info', duration);
  }

  loading(message) {
    return this.show(message, 'loading', 0); // No auto-dismiss
  }

  clear() {
    this.notifications.forEach((notification, id) => {
      this.dismiss(id);
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global notification manager
window.notifications = new NotificationManager();
