class OptionsManager {
  constructor() {
    this.defaults = {
      sortType: 'url',
      sortOrder: 'ascending'
    };
    this.statusTimeout = null;
    this.init();
  }

  init() {
    this.restoreOptions();
    this.setupEventListeners();
  }

  setupEventListeners() {
    const sortTypeEl = document.getElementById('sortType');
    const sortOrderEl = document.getElementById('sortOrder');
    
    if (sortTypeEl) {
      sortTypeEl.addEventListener('change', () => this.saveOptions());
    }
    
    if (sortOrderEl) {
      sortOrderEl.addEventListener('change', () => this.saveOptions());
    }
  }

  async saveOptions() {
    try {
      const config = this.getFormValues();
      
      if (!this.validateConfig(config)) {
        this.showStatus('Invalid configuration', 'error');
        return;
      }
      
      await chrome.storage.sync.set(config);
      this.showStatus('Settings updated', 'success');
    } catch (error) {
      console.error('Error saving options:', error);
      this.showStatus('Error saving settings', 'error');
    }
  }

  getFormValues() {
    const sortTypeEl = document.getElementById('sortType');
    const sortOrderEl = document.getElementById('sortOrder');
    
    return {
      sortType: sortTypeEl?.value || this.defaults.sortType,
      sortOrder: sortOrderEl?.value || this.defaults.sortOrder
    };
  }

  validateConfig(config) {
    const validSortTypes = ['url', 'title'];
    const validSortOrders = ['ascending', 'descending'];
    
    return validSortTypes.includes(config.sortType) && 
           validSortOrders.includes(config.sortOrder);
  }

  async restoreOptions() {
    try {
      const items = await chrome.storage.sync.get(this.defaults);
      this.setFormValues(items);
    } catch (error) {
      console.error('Error restoring options:', error);
      this.setFormValues(this.defaults);
    }
  }

  setFormValues(values) {
    const sortTypeEl = document.getElementById('sortType');
    const sortOrderEl = document.getElementById('sortOrder');
    
    if (sortTypeEl) {
      sortTypeEl.value = values.sortType;
    }
    
    if (sortOrderEl) {
      sortOrderEl.value = values.sortOrder;
    }
  }

  showStatus(message, type = 'success') {
    const statusEl = document.getElementById('status');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.opacity = '1';
    
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }
    
    this.statusTimeout = setTimeout(() => {
      statusEl.style.opacity = '0';
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});