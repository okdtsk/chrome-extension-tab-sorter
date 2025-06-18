// Background script for Tab Sorter extension
// Handles messages from popup for operations that need to continue after popup closes

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'switchToTab') {
    handleTabSwitch(request.tabId, request.windowId)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  } else if (request.action === 'closeTab') {
    handleTabClose(request.tabId)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

async function handleTabSwitch(tabId, windowId) {
  try {
    // First focus the window
    await chrome.windows.update(windowId, { focused: true });
    // Then activate the tab
    await chrome.tabs.update(tabId, { active: true });
  } catch (error) {
    console.error('Error switching tab in background:', error);
    throw error;
  }
}

async function handleTabClose(tabId) {
  try {
    // Close the tab
    await chrome.tabs.remove(tabId);
  } catch (error) {
    console.error('Error closing tab in background:', error);
    throw error;
  }
}