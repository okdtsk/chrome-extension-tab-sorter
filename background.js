class BackgroundMessageHandler {
  constructor() {
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      return this.handleMessage(request, sender, sendResponse);
    });
  }

  handleMessage(request, sender, sendResponse) {
    if (!this.isValidRequest(request)) {
      sendResponse({ success: false, error: 'Invalid request format' });
      return false;
    }

    const actionHandlers = {
      switchToTab: () => this.handleTabSwitch(request.tabId, request.windowId),
      closeTab: () => this.handleTabClose(request.tabId)
    };

    const handler = actionHandlers[request.action];
    if (!handler) {
      sendResponse({ success: false, error: `Unknown action: ${request.action}` });
      return false;
    }

    handler()
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error(`Error handling ${request.action}:`, error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  isValidRequest(request) {
    if (!request || typeof request !== 'object') {
      return false;
    }

    if (!request.action || typeof request.action !== 'string') {
      return false;
    }

    switch (request.action) {
      case 'switchToTab':
        return this.isValidTabId(request.tabId) && this.isValidWindowId(request.windowId);
      case 'closeTab':
        return this.isValidTabId(request.tabId);
      default:
        return false;
    }
  }

  isValidTabId(tabId) {
    return typeof tabId === 'number' && tabId > 0;
  }

  isValidWindowId(windowId) {
    return typeof windowId === 'number' && windowId > 0;
  }

  async handleTabSwitch(tabId, windowId) {
    try {
      await this.validateTabExists(tabId);
      await this.validateWindowExists(windowId);
      
      await chrome.windows.update(windowId, { focused: true });
      await chrome.tabs.update(tabId, { active: true });
    } catch (error) {
      console.error('Error switching tab:', { tabId, windowId, error: error.message });
      throw new Error(`Failed to switch to tab: ${error.message}`);
    }
  }

  async handleTabClose(tabId) {
    try {
      await this.validateTabExists(tabId);
      await chrome.tabs.remove(tabId);
    } catch (error) {
      console.error('Error closing tab:', { tabId, error: error.message });
      throw new Error(`Failed to close tab: ${error.message}`);
    }
  }

  async validateTabExists(tabId) {
    try {
      await chrome.tabs.get(tabId);
    } catch (error) {
      throw new Error(`Tab ${tabId} not found`);
    }
  }

  async validateWindowExists(windowId) {
    try {
      await chrome.windows.get(windowId);
    } catch (error) {
      throw new Error(`Window ${windowId} not found`);
    }
  }
}

new BackgroundMessageHandler();