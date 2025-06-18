import { sortTabs } from './sortTabs.js';
import { gatherTabsToCurrentWindow } from './gatherTabs.js';
import { analyzeAllTabs } from './tabAnalyzer.js';

// Store stats globally for click handlers
let currentStats = null;
let domainsExpanded = false;

// Handle click on duplicate tab items
async function handleTabClick(event) {
  const element = event.currentTarget;
  const tabGroup = element.dataset.tabGroup;
  const itemIndex = parseInt(element.dataset.itemIndex);
  
  console.log('Tab clicked:', { tabGroup, itemIndex });
  
  if (!currentStats) {
    console.error('No current stats available');
    return;
  }
  
  let tabs = [];
  let groupInfo = null;
  
  // Get the tabs array based on the group type
  switch(tabGroup) {
    case 'sameUrlTitle':
      groupInfo = currentStats.sameUrlAndTitle[itemIndex];
      tabs = groupInfo?.tabs || [];
      break;
    case 'sameUrlDiffTitle':
      groupInfo = currentStats.sameUrlDifferentTitle[itemIndex];
      tabs = groupInfo?.tabs || [];
      break;
    case 'sameTitleDiffUrl':
      groupInfo = currentStats.sameTitleDifferentUrl[itemIndex];
      tabs = groupInfo?.tabs || [];
      break;
    case 'domain':
      groupInfo = currentStats.tabsPerDomain[itemIndex];
      tabs = groupInfo?.tabs || [];
      break;
  }
  
  console.log('Found tabs:', tabs);
  
  // If we have tabs, show modal to select which one
  if (tabs.length > 0) {
    showTabSelectionModal(tabs, groupInfo, tabGroup);
  } else {
    console.error('No tabs found for this item');
  }
}

// Render domains list with expand/collapse functionality
function renderDomainsList(stats) {
  const domainCountsEl = document.getElementById('domain-counts');
  
  if (stats.tabsPerDomain.length === 0) {
    domainCountsEl.innerHTML = '<div class="stat-empty">No tabs found</div>';
    return;
  }
  
  const domainsToShow = domainsExpanded ? stats.tabsPerDomain : stats.tabsPerDomain.slice(0, 10);
  
  domainCountsEl.innerHTML = domainsToShow
    .map((item, index) => {
      const faviconHtml = item.favIconUrl 
        ? `<img class="stat-favicon" src="${item.favIconUrl}" alt="">`
        : `<div class="stat-favicon stat-favicon-placeholder"></div>`;
      return `<div class="stat-item clickable-tab" data-tab-group="domain" data-item-index="${index}">
        ${faviconHtml}
        <span class="stat-count">${item.count}</span>
        <span class="stat-text">${item.domain}</span>
      </div>`;
    }).join('');
    
  // Add expand/collapse link if there are more than 10 domains
  if (stats.tabsPerDomain.length > 10) {
    if (domainsExpanded) {
      domainCountsEl.innerHTML += `<div class="stat-more expand-link" id="collapse-domains">Show less</div>`;
    } else {
      domainCountsEl.innerHTML += `<div class="stat-more expand-link" id="expand-domains">...and ${stats.tabsPerDomain.length - 10} more domains</div>`;
    }
  }
  
  // Add click handlers for all clickable elements
  document.querySelectorAll('.clickable-tab').forEach(element => {
    element.addEventListener('click', handleTabClick);
  });
  
  // Add click handler for expand/collapse
  const expandLink = document.getElementById('expand-domains');
  const collapseLink = document.getElementById('collapse-domains');
  
  if (expandLink) {
    expandLink.addEventListener('click', () => {
      domainsExpanded = true;
      renderDomainsList(stats);
    });
  }
  
  if (collapseLink) {
    collapseLink.addEventListener('click', () => {
      domainsExpanded = false;
      renderDomainsList(stats);
    });
  }
}

// Refresh statistics and update modal after tab changes
async function refreshStatisticsAndModal(tabGroup, groupInfo) {
  console.log('Refreshing statistics and modal');
  
  try {
    // Reload the statistics
    const stats = await analyzeAllTabs();
    currentStats = stats;
    
    // Update the main statistics display
    updateStatisticsDisplay(stats);
    
    // Update the modal if it's still open
    const modal = document.getElementById('tab-selection-modal');
    if (modal && modal.style.display === 'flex') {
      // Find the updated group info
      let updatedTabs = [];
      let updatedGroupInfo = null;
      
      if (tabGroup === 'domain') {
        const domainItem = stats.tabsPerDomain.find(item => item.domain === groupInfo.domain);
        if (domainItem) {
          updatedTabs = domainItem.tabs;
          updatedGroupInfo = domainItem;
        }
      } else if (tabGroup === 'sameUrlTitle') {
        const item = stats.sameUrlAndTitle.find(item => item.url === groupInfo.url && item.title === groupInfo.title);
        if (item) {
          updatedTabs = item.tabs;
          updatedGroupInfo = item;
        }
      } else if (tabGroup === 'sameUrlDiffTitle') {
        const item = stats.sameUrlDifferentTitle.find(item => item.url === groupInfo.url);
        if (item) {
          updatedTabs = item.tabs;
          updatedGroupInfo = item;
        }
      } else if (tabGroup === 'sameTitleDiffUrl') {
        const item = stats.sameTitleDifferentUrl.find(item => item.title === groupInfo.title);
        if (item) {
          updatedTabs = item.tabs;
          updatedGroupInfo = item;
        }
      }
      
      // If the group still exists and has tabs, update the modal
      if (updatedTabs.length > 0) {
        showTabSelectionModal(updatedTabs, updatedGroupInfo, tabGroup);
      } else {
        // If no tabs left in this group, close the modal
        modal.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error refreshing statistics:', error);
  }
}

// Update the statistics display without reloading everything
function updateStatisticsDisplay(stats) {
  // Update Same URL & Title tabs
  const sameUrlTitleEl = document.getElementById('same-url-title');
  if (stats.sameUrlAndTitle.length > 0) {
    sameUrlTitleEl.innerHTML = stats.sameUrlAndTitle
      .slice(0, 3) // Show top 3
      .map((item, index) => {
        const truncatedTitle = item.title.length > 40 
          ? item.title.substring(0, 40) + '...' 
          : item.title;
        const faviconHtml = item.favIconUrl 
          ? `<img class="stat-favicon" src="${item.favIconUrl}" alt="">`
          : `<div class="stat-favicon stat-favicon-placeholder"></div>`;
        return `<div class="stat-item clickable-tab" data-tab-group="sameUrlTitle" data-item-index="${index}">
          ${faviconHtml}
          <span class="stat-count">${item.count}x</span>
          <span class="stat-text" title="${item.title}">${truncatedTitle}</span>
        </div>`;
      }).join('');
      
    if (stats.sameUrlAndTitle.length > 3) {
      sameUrlTitleEl.innerHTML += `<div class="stat-more">...and ${stats.sameUrlAndTitle.length - 3} more</div>`;
    }
  } else {
    sameUrlTitleEl.innerHTML = '<div class="stat-empty">No exact duplicates found</div>';
  }
  
  // Update Same URL (different titles) tabs
  const sameUrlDiffTitleEl = document.getElementById('same-url-different-title');
  if (stats.sameUrlDifferentTitle.length > 0) {
    sameUrlDiffTitleEl.innerHTML = stats.sameUrlDifferentTitle
      .slice(0, 3) // Show top 3
      .map((item, index) => {
        const truncatedUrl = item.url.length > 40 
          ? item.url.substring(0, 40) + '...' 
          : item.url;
        const titleCount = item.titles.length;
        const faviconHtml = item.favIconUrl 
          ? `<img class="stat-favicon" src="${item.favIconUrl}" alt="">`
          : `<div class="stat-favicon stat-favicon-placeholder"></div>`;
        return `<div class="stat-item clickable-tab" data-tab-group="sameUrlDiffTitle" data-item-index="${index}">
          ${faviconHtml}
          <span class="stat-count">${item.count}x</span>
          <span class="stat-text" title="${item.url}">${truncatedUrl}</span>
          <span class="stat-detail">(${titleCount} different titles)</span>
        </div>`;
      }).join('');
      
    if (stats.sameUrlDifferentTitle.length > 3) {
      sameUrlDiffTitleEl.innerHTML += `<div class="stat-more">...and ${stats.sameUrlDifferentTitle.length - 3} more</div>`;
    }
  } else {
    sameUrlDiffTitleEl.innerHTML = '<div class="stat-empty">None found</div>';
  }
  
  // Update Same Title (different URLs) tabs
  const sameTitleDiffUrlEl = document.getElementById('same-title-different-url');
  if (stats.sameTitleDifferentUrl.length > 0) {
    sameTitleDiffUrlEl.innerHTML = stats.sameTitleDifferentUrl
      .slice(0, 3) // Show top 3
      .map((item, index) => {
        const truncatedTitle = item.title.length > 40 
          ? item.title.substring(0, 40) + '...' 
          : item.title;
        const urlCount = item.urls.length;
        const faviconHtml = item.favIconUrl 
          ? `<img class="stat-favicon" src="${item.favIconUrl}" alt="">`
          : `<div class="stat-favicon stat-favicon-placeholder"></div>`;
        return `<div class="stat-item clickable-tab" data-tab-group="sameTitleDiffUrl" data-item-index="${index}">
          ${faviconHtml}
          <span class="stat-count">${item.count}x</span>
          <span class="stat-text" title="${item.title}">${truncatedTitle}</span>
          <span class="stat-detail">(${urlCount} different URLs)</span>
        </div>`;
      }).join('');
      
    if (stats.sameTitleDifferentUrl.length > 3) {
      sameTitleDiffUrlEl.innerHTML += `<div class="stat-more">...and ${stats.sameTitleDifferentUrl.length - 3} more</div>`;
    }
  } else {
    sameTitleDiffUrlEl.innerHTML = '<div class="stat-empty">None found</div>';
  }
  
  // Update domains list
  renderDomainsList(stats);
  
  // Update header with total count
  const statsHeader = document.querySelector('.statistics h3');
  statsHeader.textContent = `Tab Statistics (${stats.totalTabs} tabs in ${stats.totalWindows} windows)`;
  
  // Re-add click handlers for duplicate tabs (domains are handled in renderDomainsList)
  document.querySelectorAll('.clickable-tab:not([data-tab-group="domain"])').forEach(element => {
    element.addEventListener('click', handleTabClick);
  });
}

// Show modal with tab selection
function showTabSelectionModal(tabs, groupInfo, tabGroup) {
  console.log('showTabSelectionModal called with tabs:', tabs);
  
  const modal = document.getElementById('tab-selection-modal');
  const tabList = document.getElementById('tab-selection-list');
  const modalTitle = modal?.querySelector('h3');
  
  if (!modal || !tabList) {
    console.error('Modal elements not found:', { modal, tabList });
    return;
  }
  
  // Store group info in modal data attributes for use in tab close handler
  modal.dataset.tabGroup = tabGroup;
  modal.dataset.groupInfo = JSON.stringify(groupInfo);
  
  // Update modal title based on what was clicked
  if (modalTitle && groupInfo && tabGroup === 'domain') {
    modalTitle.textContent = `Select a tab from ${groupInfo.domain}:`;
  } else if (modalTitle) {
    modalTitle.textContent = 'Select a tab to switch to:';
  }
  
  // Clear previous content
  tabList.innerHTML = '';
  
  // Add each tab as an option
  tabs.forEach((tab, index) => {
    console.log(`Creating option for tab ${index}:`, tab);
    
    const tabOption = document.createElement('div');
    tabOption.className = 'tab-option';
    const faviconHtml = tab.favIconUrl 
      ? `<img class="tab-option-favicon" src="${tab.favIconUrl}" alt="">`
      : `<div class="tab-option-favicon stat-favicon-placeholder"></div>`;
    tabOption.innerHTML = `
      ${faviconHtml}
      <div class="tab-option-content">
        <div class="tab-option-title">${tab.title || 'Untitled'}</div>
        <div class="tab-option-url">${tab.url || ''}</div>
      </div>
      <button class="tab-close-btn" data-tab-id="${tab.id}" title="Close tab">×</button>
    `;
    
    tabOption.addEventListener('click', async (event) => {
      // Check if close button was clicked
      if (event.target.classList.contains('tab-close-btn')) {
        event.stopPropagation();
        const tabId = parseInt(event.target.dataset.tabId);
        console.log('Close button clicked for tab:', tabId);
        
        try {
          // Send message to background script to close the tab
          const response = await chrome.runtime.sendMessage({
            action: 'closeTab',
            tabId: tabId
          });
          
          if (response.success) {
            console.log('Tab closed successfully');
            // Remove the tab option from the modal
            tabOption.remove();
            
            // Get group info from modal data attributes
            const modalTabGroup = modal.dataset.tabGroup;
            const modalGroupInfo = JSON.parse(modal.dataset.groupInfo || '{}');
            
            // Always refresh statistics to update all counts and views
            await refreshStatisticsAndModal(modalTabGroup, modalGroupInfo);
            
            // If no more tabs, close the modal
            const remainingTabs = tabList.querySelectorAll('.tab-option');
            if (remainingTabs.length === 0) {
              modal.style.display = 'none';
            }
          } else {
            throw new Error(response.error || 'Unknown error');
          }
        } catch (error) {
          console.error('Error closing tab:', error);
          alert('Error closing tab: ' + error.message);
        }
        return;
      }
      
      console.log('Tab option clicked:', { tab, event });
      
      try {
        console.log(`Attempting to switch to tab ${tab.id} in window ${tab.windowId}`);
        
        // Send message to background script to handle tab switching
        const response = await chrome.runtime.sendMessage({
          action: 'switchToTab',
          tabId: tab.id,
          windowId: tab.windowId
        });
        
        if (response.success) {
          console.log('Tab switch successful, closing popup...');
          // Close the popup after successful switch
          window.close();
        } else {
          throw new Error(response.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Error switching to tab:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          tab: tab
        });
        alert('Error switching to tab: ' + error.message);
      }
    });
    
    tabList.appendChild(tabOption);
  });
  
  console.log('Showing modal...');
  // Show modal
  modal.style.display = 'flex';
}

// Load and display tab statistics
async function loadStatistics() {
  try {
    const stats = await analyzeAllTabs();
    currentStats = stats;
    
    // Hide loading message and show content
    document.getElementById('stats-loading').style.display = 'none';
    document.getElementById('stats-content').style.display = 'block';
    
    // Display Same URL & Title tabs
    const sameUrlTitleEl = document.getElementById('same-url-title');
    if (stats.sameUrlAndTitle.length > 0) {
      sameUrlTitleEl.innerHTML = stats.sameUrlAndTitle
        .slice(0, 3) // Show top 3
        .map((item, index) => {
          const truncatedTitle = item.title.length > 40 
            ? item.title.substring(0, 40) + '...' 
            : item.title;
          const faviconHtml = item.favIconUrl 
            ? `<img class="stat-favicon" src="${item.favIconUrl}" alt="">`
            : `<div class="stat-favicon stat-favicon-placeholder"></div>`;
          return `<div class="stat-item clickable-tab" data-tab-group="sameUrlTitle" data-item-index="${index}">
            ${faviconHtml}
            <span class="stat-count">${item.count}x</span>
            <span class="stat-text" title="${item.title}">${truncatedTitle}</span>
          </div>`;
        }).join('');
        
      if (stats.sameUrlAndTitle.length > 3) {
        sameUrlTitleEl.innerHTML += `<div class="stat-more">...and ${stats.sameUrlAndTitle.length - 3} more</div>`;
      }
    } else {
      sameUrlTitleEl.innerHTML = '<div class="stat-empty">No exact duplicates found</div>';
    }
    
    // Display Same URL (different titles) tabs
    const sameUrlDiffTitleEl = document.getElementById('same-url-different-title');
    if (stats.sameUrlDifferentTitle.length > 0) {
      sameUrlDiffTitleEl.innerHTML = stats.sameUrlDifferentTitle
        .slice(0, 3) // Show top 3
        .map((item, index) => {
          const truncatedUrl = item.url.length > 40 
            ? item.url.substring(0, 40) + '...' 
            : item.url;
          const titleCount = item.titles.length;
          const faviconHtml = item.favIconUrl 
            ? `<img class="stat-favicon" src="${item.favIconUrl}" alt="">`
            : `<div class="stat-favicon stat-favicon-placeholder"></div>`;
          return `<div class="stat-item clickable-tab" data-tab-group="sameUrlDiffTitle" data-item-index="${index}">
            ${faviconHtml}
            <span class="stat-count">${item.count}x</span>
            <span class="stat-text" title="${item.url}">${truncatedUrl}</span>
            <span class="stat-detail">(${titleCount} different titles)</span>
          </div>`;
        }).join('');
        
      if (stats.sameUrlDifferentTitle.length > 3) {
        sameUrlDiffTitleEl.innerHTML += `<div class="stat-more">...and ${stats.sameUrlDifferentTitle.length - 3} more</div>`;
      }
    } else {
      sameUrlDiffTitleEl.innerHTML = '<div class="stat-empty">None found</div>';
    }
    
    // Display Same Title (different URLs) tabs
    const sameTitleDiffUrlEl = document.getElementById('same-title-different-url');
    if (stats.sameTitleDifferentUrl.length > 0) {
      sameTitleDiffUrlEl.innerHTML = stats.sameTitleDifferentUrl
        .slice(0, 3) // Show top 3
        .map((item, index) => {
          const truncatedTitle = item.title.length > 40 
            ? item.title.substring(0, 40) + '...' 
            : item.title;
          const urlCount = item.urls.length;
          const faviconHtml = item.favIconUrl 
            ? `<img class="stat-favicon" src="${item.favIconUrl}" alt="">`
            : `<div class="stat-favicon stat-favicon-placeholder"></div>`;
          return `<div class="stat-item clickable-tab" data-tab-group="sameTitleDiffUrl" data-item-index="${index}">
            ${faviconHtml}
            <span class="stat-count">${item.count}x</span>
            <span class="stat-text" title="${item.title}">${truncatedTitle}</span>
            <span class="stat-detail">(${urlCount} different URLs)</span>
          </div>`;
        }).join('');
        
      if (stats.sameTitleDifferentUrl.length > 3) {
        sameTitleDiffUrlEl.innerHTML += `<div class="stat-more">...and ${stats.sameTitleDifferentUrl.length - 3} more</div>`;
      }
    } else {
      sameTitleDiffUrlEl.innerHTML = '<div class="stat-empty">None found</div>';
    }
    
    // Display tabs per domain
    renderDomainsList(stats);
    
    // Update header with total count
    const statsHeader = document.querySelector('.statistics h3');
    statsHeader.textContent = `Tab Statistics (${stats.totalTabs} tabs in ${stats.totalWindows} windows)`;
    
    // Add click handlers for duplicate tabs (domains are handled in renderDomainsList)
    document.querySelectorAll('.clickable-tab:not([data-tab-group="domain"])').forEach(element => {
      element.addEventListener('click', handleTabClick);
    });
    
  } catch (error) {
    console.error('Error loading statistics:', error);
    document.getElementById('stats-loading').textContent = 'Error loading statistics';
  }
}

// Sort button handler
document.getElementById('sortButton').addEventListener('click', async () => {
  const button = document.getElementById('sortButton');
  button.disabled = true;
  button.classList.add('loading');
  
  try {
    await sortTabs();
    // Close popup after successful sort
    window.close();
  } catch (error) {
    console.error('Error sorting tabs:', error);
    button.classList.remove('loading');
    button.disabled = false;
  }
});

// Gather button handler
document.getElementById('gatherButton').addEventListener('click', async () => {
  const button = document.getElementById('gatherButton');
  button.disabled = true;
  button.classList.add('loading');
  
  try {
    await gatherTabsToCurrentWindow();
    // Close popup after successful gather
    window.close();
  } catch (error) {
    console.error('Error gathering tabs:', error);
    button.classList.remove('loading');
    button.disabled = false;
  }
});

// Load statistics when popup opens and setup modal handlers
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded - popup.js loaded');
  
  loadStatistics();
  
  // Setup modal close handlers
  const closeButton = document.getElementById('close-modal');
  const modal = document.getElementById('tab-selection-modal');
  
  console.log('Modal elements found:', { closeButton: !!closeButton, modal: !!modal });
  
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      console.log('Close button clicked');
      modal.style.display = 'none';
    });
  }
  
  // Close modal when clicking outside
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      console.log('Modal overlay clicked');
      modal.style.display = 'none';
    }
  });
  
  // Test Chrome API access
  chrome.tabs.query({}, (tabs) => {
    console.log('Chrome tabs API test - found tabs:', tabs.length);
  });
});