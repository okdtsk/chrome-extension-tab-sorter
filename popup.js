import { sortTabs } from './sortTabs.js';
import { gatherTabsToCurrentWindow } from './gatherTabs.js';
import { analyzeAllTabs } from './tabAnalyzer.js';

class PopupController {
  constructor() {
    this.currentStats = null;
    this.domainsExpanded = false;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadStatistics();
  }

  setupEventListeners() {
    document.getElementById('sortButton').addEventListener('click', () => this.handleSortClick());
    document.getElementById('gatherButton').addEventListener('click', () => this.handleGatherClick());
    
    const closeButton = document.getElementById('close-modal');
    const modal = document.getElementById('tab-selection-modal');
    
    if (closeButton) {
      closeButton.addEventListener('click', () => this.closeModal());
    }
    
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }
  }

  closeModal() {
    const modal = document.getElementById('tab-selection-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  async handleTabClick(event) {
    const element = event.currentTarget;
    const tabGroup = element.dataset.tabGroup;
    const itemIndex = parseInt(element.dataset.itemIndex);
    
    console.log('Tab clicked:', { tabGroup, itemIndex });
    
    if (!this.currentStats) {
      console.error('No current stats available');
      return;
    }
  
    const { tabs, groupInfo } = this.getTabsForGroup(tabGroup, itemIndex);
    
    console.log('Found tabs:', tabs);
    
    if (tabs.length > 0) {
      this.showTabSelectionModal(tabs, groupInfo, tabGroup);
    } else {
      console.error('No tabs found for this item');
    }
  }

  getTabsForGroup(tabGroup, itemIndex) {
    const statsMap = {
      sameUrlTitle: this.currentStats.sameUrlAndTitle,
      sameUrlDiffTitle: this.currentStats.sameUrlDifferentTitle,
      sameTitleDiffUrl: this.currentStats.sameTitleDifferentUrl,
      domain: this.currentStats.tabsPerDomain
    };
    
    const groupInfo = statsMap[tabGroup]?.[itemIndex];
    const tabs = groupInfo?.tabs || [];
    
    return { tabs, groupInfo };
  }

  renderDomainsList(stats) {
    const domainCountsEl = document.getElementById('domain-counts');
    
    if (stats.tabsPerDomain.length === 0) {
      domainCountsEl.innerHTML = '<div class="stat-empty">No tabs found</div>';
      return;
    }
    
    const domainsToShow = this.domainsExpanded ? stats.tabsPerDomain : stats.tabsPerDomain.slice(0, 10);
  
    domainCountsEl.innerHTML = this.buildDomainsHTML(domainsToShow) + this.buildExpandCollapseHTML(stats);
    
    this.attachDomainEventListeners(stats);
  }

  buildDomainsHTML(domainsToShow) {
    return domainsToShow
      .map((item, index) => {
        const faviconHtml = this.createFaviconHTML(item.favIconUrl);
        return `<div class="stat-item clickable-tab" data-tab-group="domain" data-item-index="${index}">
          ${faviconHtml}
          <span class="stat-count">${item.count}</span>
          <span class="stat-text">${item.domain}</span>
        </div>`;
      }).join('');
  }

  buildExpandCollapseHTML(stats) {
    if (stats.tabsPerDomain.length <= 10) return '';
    
    if (this.domainsExpanded) {
      return `<div class="stat-more expand-link" id="collapse-domains">Show less</div>`;
    } else {
      return `<div class="stat-more expand-link" id="expand-domains">...and ${stats.tabsPerDomain.length - 10} more domains</div>`;
    }
  }

  attachDomainEventListeners(stats) {
    document.querySelectorAll('.clickable-tab').forEach(element => {
      element.addEventListener('click', (e) => this.handleTabClick(e));
    });
    
    const expandLink = document.getElementById('expand-domains');
    const collapseLink = document.getElementById('collapse-domains');
    
    if (expandLink) {
      expandLink.addEventListener('click', () => {
        this.domainsExpanded = true;
        this.renderDomainsList(stats);
      });
    }
    
    if (collapseLink) {
      collapseLink.addEventListener('click', () => {
        this.domainsExpanded = false;
        this.renderDomainsList(stats);
      });
    }
  }

  createFaviconHTML(favIconUrl) {
    return favIconUrl 
      ? `<img class="stat-favicon" src="${favIconUrl}" alt="">`
      : `<div class="stat-favicon stat-favicon-placeholder"></div>`;
  }

  sortTabsByLastViewed(tabs) {
    return [...tabs].sort((a, b) => {
      const timeA = a.lastAccessed || 0;
      const timeB = b.lastAccessed || 0;
      
      // Sort by oldest first (smallest timestamp first)
      return timeA - timeB;
    });
  }

  async refreshStatisticsAndModal(tabGroup, groupInfo) {
    console.log('Refreshing statistics and modal');
    
    try {
      const stats = await analyzeAllTabs();
      this.currentStats = stats;
      
      this.updateStatisticsDisplay(stats);
      
      const modal = document.getElementById('tab-selection-modal');
      if (modal && modal.style.display === 'flex') {
        const { updatedTabs, updatedGroupInfo } = this.findUpdatedGroupInfo(stats, tabGroup, groupInfo);
        
        if (updatedTabs.length > 0) {
          this.showTabSelectionModal(updatedTabs, updatedGroupInfo, tabGroup);
        } else {
          modal.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Error refreshing statistics:', error);
    }
  }

  findUpdatedGroupInfo(stats, tabGroup, groupInfo) {
    const finders = {
      domain: () => stats.tabsPerDomain.find(item => item.domain === groupInfo.domain),
      sameUrlTitle: () => stats.sameUrlAndTitle.find(item => item.url === groupInfo.url && item.title === groupInfo.title),
      sameUrlDiffTitle: () => stats.sameUrlDifferentTitle.find(item => item.url === groupInfo.url),
      sameTitleDiffUrl: () => stats.sameTitleDifferentUrl.find(item => item.title === groupInfo.title)
    };
    
    const updatedGroupInfo = finders[tabGroup]?.() || null;
    const updatedTabs = updatedGroupInfo?.tabs || [];
    
    return { updatedTabs, updatedGroupInfo };
  }

  formatTimeInfo(lastAccessed) {
    if (!lastAccessed) {
      return 'Last viewed: Unknown';
    }
    
    const timeDiff = Date.now() - lastAccessed;
    const timeUnits = [
      { unit: 'day', ms: 24 * 60 * 60 * 1000 },
      { unit: 'hour', ms: 60 * 60 * 1000 },
      { unit: 'minute', ms: 60 * 1000 },
      { unit: 'second', ms: 1000 }
    ];
    
    for (const { unit, ms } of timeUnits) {
      const value = Math.floor(timeDiff / ms);
      if (value > 0) {
        if (unit === 'second' && value <= 10) {
          return 'Last viewed: Just now';
        }
        const plural = value > 1 ? 's' : '';
        return `Last viewed: ${value} ${unit}${plural} ago`;
      }
    }
    
    return 'Last viewed: Just now';
  }

  updateStatisticsDisplay(stats) {
    this.updateStatSection('same-url-title', stats.sameUrlAndTitle, 'sameUrlTitle', 'No exact duplicates found');
    this.updateStatSection('same-url-different-title', stats.sameUrlDifferentTitle, 'sameUrlDiffTitle', 'None found');
    this.updateStatSection('same-title-different-url', stats.sameTitleDifferentUrl, 'sameTitleDiffUrl', 'None found');
    
    this.renderDomainsList(stats);
    
    const statsHeader = document.querySelector('.statistics h3');
    statsHeader.textContent = `Tab Statistics (${stats.totalTabs} tabs in ${stats.totalWindows} windows)`;
    
    this.attachClickHandlers();
  }

  updateStatSection(elementId, items, tabGroup, emptyMessage) {
    const element = document.getElementById(elementId);
    
    if (items.length > 0) {
      element.innerHTML = this.buildStatItemsHTML(items, tabGroup) + this.buildMoreItemsHTML(items);
    } else {
      element.innerHTML = `<div class="stat-empty">${emptyMessage}</div>`;
    }
  }

  buildStatItemsHTML(items, tabGroup) {
    return items
      .slice(0, 3)
      .map((item, index) => this.createStatItemHTML(item, tabGroup, index))
      .join('');
  }

  createStatItemHTML(item, tabGroup, index) {
    const faviconHtml = this.createFaviconHTML(item.favIconUrl);
    const { text, title, detail } = this.getItemDisplayInfo(item, tabGroup);
    
    return `<div class="stat-item clickable-tab" data-tab-group="${tabGroup}" data-item-index="${index}">
      ${faviconHtml}
      <span class="stat-count">${item.count}x</span>
      <span class="stat-text" title="${title}">${text}</span>
      ${detail ? `<span class="stat-detail">${detail}</span>` : ''}
    </div>`;
  }

  getItemDisplayInfo(item, tabGroup) {
    const truncate = (str, length = 40) => str.length > length ? str.substring(0, length) + '...' : str;
    
    switch (tabGroup) {
      case 'sameUrlTitle':
        return { text: truncate(item.title), title: item.title, detail: null };
      case 'sameUrlDiffTitle':
        return { text: truncate(item.url), title: item.url, detail: `(${item.titles.length} different titles)` };
      case 'sameTitleDiffUrl':
        return { text: truncate(item.title), title: item.title, detail: `(${item.urls.length} different URLs)` };
    }
  }

  buildMoreItemsHTML(items) {
    return items.length > 3 ? `<div class="stat-more">...and ${items.length - 3} more</div>` : '';
  }

  attachClickHandlers() {
    document.querySelectorAll('.clickable-tab:not([data-tab-group="domain"])').forEach(element => {
      element.addEventListener('click', (e) => this.handleTabClick(e));
    });
  }
  

  showTabSelectionModal(tabs, groupInfo, tabGroup) {
    console.log('showTabSelectionModal called with tabs:', tabs);
    
    const modal = document.getElementById('tab-selection-modal');
    const tabList = document.getElementById('tab-selection-list');
    const modalTitle = modal?.querySelector('h3');
    
    if (!modal || !tabList) {
      console.error('Modal elements not found:', { modal, tabList });
      return;
    }
    
    this.setupModalData(modal, tabGroup, groupInfo);
    this.updateModalTitle(modalTitle, groupInfo, tabGroup);
    
    tabList.innerHTML = '';
    
    const sortedTabs = this.sortTabsByLastViewed(tabs);
    
    sortedTabs.forEach((tab) => {
      const tabOption = this.createTabOption(tab, modal, tabList);
      tabList.appendChild(tabOption);
    });
    
    modal.style.display = 'flex';
  }

  setupModalData(modal, tabGroup, groupInfo) {
    modal.dataset.tabGroup = tabGroup;
    modal.dataset.groupInfo = JSON.stringify(groupInfo);
  }

  updateModalTitle(modalTitle, groupInfo, tabGroup) {
    if (!modalTitle) return;
    
    if (groupInfo && tabGroup === 'domain') {
      modalTitle.textContent = `Select a tab from ${groupInfo.domain}:`;
    } else {
      modalTitle.textContent = 'Select a tab to switch to:';
    }
  }

  createTabOption(tab, modal, tabList) {
    const tabOption = document.createElement('div');
    tabOption.className = 'tab-option';
    
    const faviconHtml = this.createTabOptionFaviconHTML(tab.favIconUrl);
    const timeInfo = this.formatTimeInfo(tab.lastAccessed);
    
    tabOption.innerHTML = `
      ${faviconHtml}
      <div class="tab-option-content">
        <div class="tab-option-title">${tab.title || 'Untitled'}</div>
        <div class="tab-option-url">${tab.url || ''}</div>
        <div class="tab-time-info">${timeInfo}</div>
      </div>
      <button class="tab-close-btn" data-tab-id="${tab.id}" title="Close tab">×</button>
    `;
    
    tabOption.addEventListener('click', (event) => this.handleTabOptionClick(event, tab, modal, tabList));
    
    return tabOption;
  }

  createTabOptionFaviconHTML(favIconUrl) {
    return favIconUrl 
      ? `<img class="tab-option-favicon" src="${favIconUrl}" alt="">`
      : `<div class="tab-option-favicon stat-favicon-placeholder"></div>`;
  }

  async handleTabOptionClick(event, tab, modal, tabList) {
    if (event.target.classList.contains('tab-close-btn')) {
      await this.handleTabClose(event, tab, modal, tabList);
      return;
    }
    
    await this.handleTabSwitch(tab);
  }

  async handleTabClose(event, _unusedTab, modal, tabList) {
    event.stopPropagation();
    const tabId = parseInt(event.target.dataset.tabId);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'closeTab',
        tabId: tabId
      });
      
      if (response.success) {
        event.currentTarget.remove();
        
        const modalTabGroup = modal.dataset.tabGroup;
        const modalGroupInfo = JSON.parse(modal.dataset.groupInfo || '{}');
        
        await this.refreshStatisticsAndModal(modalTabGroup, modalGroupInfo);
        
        if (tabList.querySelectorAll('.tab-option').length === 0) {
          modal.style.display = 'none';
        }
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error closing tab:', error);
      alert('Error closing tab: ' + error.message);
    }
  }

  async handleTabSwitch(tab) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'switchToTab',
        tabId: tab.id,
        windowId: tab.windowId
      });
      
      if (response.success) {
        window.close();
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error switching to tab:', error);
      alert('Error switching to tab: ' + error.message);
    }
  }

  async loadStatistics() {
    try {
      const stats = await analyzeAllTabs();
      this.currentStats = stats;
      
      this.showStatsContent();
      this.updateStatisticsDisplay(stats);
      
    } catch (error) {
      console.error('Error loading statistics:', error);
      document.getElementById('stats-loading').textContent = 'Error loading statistics';
    }
  }

  showStatsContent() {
    document.getElementById('stats-loading').style.display = 'none';
    document.getElementById('stats-content').style.display = 'block';
  }

  async handleSortClick() {
    const button = document.getElementById('sortButton');
    this.setButtonLoading(button, true);
    
    try {
      await sortTabs();
      window.close();
    } catch (error) {
      console.error('Error sorting tabs:', error);
      this.setButtonLoading(button, false);
    }
  }

  async handleGatherClick() {
    const button = document.getElementById('gatherButton');
    this.setButtonLoading(button, true);
    
    try {
      await gatherTabsToCurrentWindow();
      window.close();
    } catch (error) {
      console.error('Error gathering tabs:', error);
      this.setButtonLoading(button, false);
    }
  }

  setButtonLoading(button, isLoading) {
    button.disabled = isLoading;
    if (isLoading) {
      button.classList.add('loading');
    } else {
      button.classList.remove('loading');
    }
  }

}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded - popup.js loaded');
  new PopupController();
  
  chrome.tabs.query({}, (tabs) => {
    console.log('Chrome tabs API test - found tabs:', tabs.length);
  });
});