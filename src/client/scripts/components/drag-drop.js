// Drag & Drop System for Symposium
class DragDropManager {
  constructor() {
    this.draggedElement = null;
    this.draggedData = null;
    this.dropZones = new Map();
    this.init();
  }

  init() {
    // Add global event listeners for drag and drop
    document.addEventListener('dragstart', this.handleDragStart.bind(this));
    document.addEventListener('dragend', this.handleDragEnd.bind(this));
    document.addEventListener('dragover', this.handleDragOver.bind(this));
    document.addEventListener('drop', this.handleDrop.bind(this));
    document.addEventListener('dragenter', this.handleDragEnter.bind(this));
    document.addEventListener('dragleave', this.handleDragLeave.bind(this));
  }

  // Make an element draggable
  makeDraggable(element, data, options = {}) {
    element.draggable = true;
    element.dataset.dragData = JSON.stringify(data);
    element.dataset.dragType = options.type || 'default';
    
    // Add visual indicators
    element.classList.add('draggable');
    
    // Add drag handle if specified
    if (options.handle) {
      const handle = element.querySelector(options.handle);
      if (handle) {
        handle.classList.add('drag-handle');
        handle.title = 'Drag to reorder';
      }
    }
  }

  // Register a drop zone
  registerDropZone(element, options = {}) {
    const id = options.id || element.id || `dropzone-${Date.now()}`;
    
    this.dropZones.set(id, {
      element,
      accepts: options.accepts || ['default'],
      onDrop: options.onDrop,
      onDragEnter: options.onDragEnter,
      onDragLeave: options.onDragLeave,
      ...options
    });

    element.classList.add('drop-zone');
    element.dataset.dropZoneId = id;
    
    return id;
  }

  // Remove a drop zone
  unregisterDropZone(id) {
    const dropZone = this.dropZones.get(id);
    if (dropZone) {
      dropZone.element.classList.remove('drop-zone', 'drag-over');
      delete dropZone.element.dataset.dropZoneId;
      this.dropZones.delete(id);
    }
  }

  handleDragStart(e) {
    if (!e.target.draggable) return;

    this.draggedElement = e.target;
    this.draggedData = JSON.parse(e.target.dataset.dragData || '{}');
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // For compatibility
    
    // Add dragging class for visual feedback
    e.target.classList.add('dragging');
    
    // Create drag image (optional)
    if (this.draggedData.type === 'task') {
      this.createDragImage(e);
    }

    // Add body class to indicate dragging state
    document.body.classList.add('dragging-active');
  }

  handleDragEnd(e) {
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
      this.draggedElement = null;
      this.draggedData = null;
    }

    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });

    // Remove body dragging class
    document.body.classList.remove('dragging-active');
  }

  handleDragOver(e) {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = 'move';
  }

  handleDragEnter(e) {
    const dropZone = this.getDropZone(e.target);
    if (dropZone && this.canDrop(dropZone)) {
      e.preventDefault();
      dropZone.element.classList.add('drag-over');
      
      if (dropZone.onDragEnter) {
        dropZone.onDragEnter(this.draggedData, e);
      }
    }
  }

  handleDragLeave(e) {
    const dropZone = this.getDropZone(e.target);
    if (dropZone) {
      // Only remove drag-over if we're actually leaving the drop zone
      if (!dropZone.element.contains(e.relatedTarget)) {
        dropZone.element.classList.remove('drag-over');
        
        if (dropZone.onDragLeave) {
          dropZone.onDragLeave(this.draggedData, e);
        }
      }
    }
  }

  handleDrop(e) {
    e.preventDefault();
    
    const dropZone = this.getDropZone(e.target);
    if (dropZone && this.canDrop(dropZone)) {
      dropZone.element.classList.remove('drag-over');
      
      if (dropZone.onDrop) {
        const dropTarget = this.getDropTarget(e, dropZone);
        dropZone.onDrop(this.draggedData, dropTarget, e);
      }
    }
  }

  getDropZone(element) {
    // Find the closest drop zone
    const dropZoneElement = element.closest('.drop-zone');
    if (dropZoneElement) {
      const id = dropZoneElement.dataset.dropZoneId;
      return this.dropZones.get(id);
    }
    return null;
  }

  canDrop(dropZone) {
    if (!this.draggedData || !dropZone) return false;
    
    const dragType = this.draggedData.type || 'default';
    return dropZone.accepts.includes(dragType) || dropZone.accepts.includes('*');
  }

  getDropTarget(e, dropZone) {
    // Find the specific drop target within the drop zone
    const rect = dropZone.element.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Find all draggable items in the drop zone
    const items = Array.from(dropZone.element.querySelectorAll('.draggable'));
    
    let insertIndex = items.length;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item === this.draggedElement) continue;
      
      const itemRect = item.getBoundingClientRect();
      const itemY = itemRect.top - rect.top + itemRect.height / 2;
      
      if (y < itemY) {
        insertIndex = i;
        break;
      }
    }
    
    return {
      index: insertIndex,
      element: items[insertIndex] || null,
      items: items
    };
  }

  createDragImage(e) {
    // Create a custom drag image for better visual feedback
    const dragImage = this.draggedElement.cloneNode(true);
    dragImage.style.transform = 'rotate(5deg)';
    dragImage.style.opacity = '0.8';
    dragImage.style.pointerEvents = 'none';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.zIndex = '1000';
    
    document.body.appendChild(dragImage);
    
    e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
    
    // Clean up drag image after drag starts
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  }

  // Utility method to animate element movement
  animateMove(element, fromRect, toRect, duration = 300) {
    const deltaX = fromRect.left - toRect.left;
    const deltaY = fromRect.top - toRect.top;
    
    element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    element.style.transition = 'none';
    
    requestAnimationFrame(() => {
      element.style.transition = `transform ${duration}ms ease-out`;
      element.style.transform = 'translate(0, 0)';
      
      setTimeout(() => {
        element.style.transition = '';
        element.style.transform = '';
      }, duration);
    });
  }

  // Add visual feedback for drag operations
  addDragStyles() {
    if (document.getElementById('drag-drop-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'drag-drop-styles';
    styles.textContent = `
      .draggable {
        transition: transform var(--transition-fast), box-shadow var(--transition-fast);
      }
      
      .draggable:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
      }
      
      .draggable.dragging {
        opacity: 0.5;
        transform: rotate(5deg);
        z-index: 1000;
      }
      
      .drag-handle {
        cursor: grab;
        opacity: 0.6;
        transition: opacity var(--transition-fast);
      }
      
      .drag-handle:hover {
        opacity: 1;
      }
      
      .drag-handle:active {
        cursor: grabbing;
      }
      
      .drop-zone {
        transition: background-color var(--transition-fast), border-color var(--transition-fast);
      }
      
      .drop-zone.drag-over {
        background-color: var(--color-primary-light);
        border-color: var(--color-primary);
      }
      
      .dragging-active .draggable:not(.dragging) {
        transition: transform var(--transition-fast);
      }
      
      .dragging-active .drop-zone:not(.drag-over) {
        opacity: 0.7;
      }
      
      .drag-placeholder {
        height: 2px;
        background-color: var(--color-primary);
        margin: var(--spacing-xs) 0;
        border-radius: var(--radius-full);
        opacity: 0;
        transition: opacity var(--transition-fast);
      }
      
      .drag-placeholder.active {
        opacity: 1;
      }
    `;
    
    document.head.appendChild(styles);
  }
}

// Create global drag & drop manager
window.dragDrop = new DragDropManager();

// Add styles when the script loads
document.addEventListener('DOMContentLoaded', () => {
  window.dragDrop.addDragStyles();
});
