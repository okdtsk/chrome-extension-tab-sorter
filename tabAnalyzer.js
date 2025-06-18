class TabAnalyzer {
  constructor() {
    this.allWindows = [];
    this.allTabs = [];
    this.urlGroups = {};
    this.titleGroups = {};
    this.domainData = {};
  }

  async initialize() {
    this.allWindows = await chrome.windows.getAll({ populate: true });
    this.collectAllTabs();
    this.groupTabsByUrl();
    this.groupTabsByTitle();
    this.analyzeDomains();
  }

  collectAllTabs() {
    for (const window of this.allWindows) {
      if (window.tabs) {
        this.allTabs.push(...window.tabs);
      }
    }
  }

  createTabInfo(tab) {
    return {
      id: tab.id,
      title: tab.title,
      url: tab.url,
      windowId: tab.windowId,
      favIconUrl: tab.favIconUrl || null,
      lastAccessed: tab.lastAccessed || null
    };
  }

  groupTabsByUrl() {
    this.allTabs.forEach(tab => {
      if (tab.url) {
        if (!this.urlGroups[tab.url]) {
          this.urlGroups[tab.url] = [];
        }
        this.urlGroups[tab.url].push(this.createTabInfo(tab));
      }
    });
  }

  groupTabsByTitle() {
    this.allTabs.forEach(tab => {
      if (tab.title) {
        if (!this.titleGroups[tab.title]) {
          this.titleGroups[tab.title] = [];
        }
        this.titleGroups[tab.title].push(this.createTabInfo(tab));
      }
    });
  }
  
  categorizeDuplicates() {
    const sameUrlAndTitle = this.findSameUrlAndTitle();
    const sameUrlDifferentTitle = this.findSameUrlDifferentTitle();
    const sameTitleDifferentUrl = this.findSameTitleDifferentUrl(sameUrlAndTitle);
    
    return {
      sameUrlAndTitle: this.sortByCount(sameUrlAndTitle),
      sameUrlDifferentTitle: this.sortByCount(sameUrlDifferentTitle),
      sameTitleDifferentUrl: this.sortByCount(sameTitleDifferentUrl)
    };
  }

  findSameUrlAndTitle() {
    const results = [];
    
    for (const [url, tabs] of Object.entries(this.urlGroups)) {
      if (tabs.length > 1 && this.allTabsHaveSameTitle(tabs)) {
        results.push({
          url: url,
          title: tabs[0].title,
          count: tabs.length,
          tabs: tabs,
          favIconUrl: tabs[0].favIconUrl
        });
      }
    }
    
    return results;
  }

  findSameUrlDifferentTitle() {
    const results = [];
    
    for (const [url, tabs] of Object.entries(this.urlGroups)) {
      if (tabs.length > 1 && !this.allTabsHaveSameTitle(tabs)) {
        const titleMap = this.createTitleCountMap(tabs);
        
        results.push({
          url: url,
          count: tabs.length,
          titles: Object.keys(titleMap),
          tabs: tabs,
          favIconUrl: tabs[0].favIconUrl
        });
      }
    }
    
    return results;
  }

  findSameTitleDifferentUrl(sameUrlAndTitle) {
    const results = [];
    
    for (const [title, tabs] of Object.entries(this.titleGroups)) {
      if (tabs.length > 1 && this.hasMultipleUrls(tabs) && !this.isAlreadyInSameUrlAndTitle(title, sameUrlAndTitle)) {
        const urlSet = new Set(tabs.map(tab => tab.url));
        
        results.push({
          title: title,
          count: tabs.length,
          urls: Array.from(urlSet),
          tabs: tabs,
          favIconUrl: tabs[0].favIconUrl
        });
      }
    }
    
    return results;
  }

  allTabsHaveSameTitle(tabs) {
    const firstTitle = tabs[0].title;
    return tabs.every(tab => tab.title === firstTitle);
  }

  createTitleCountMap(tabs) {
    const titleMap = {};
    tabs.forEach(tab => {
      titleMap[tab.title] = (titleMap[tab.title] || 0) + 1;
    });
    return titleMap;
  }

  hasMultipleUrls(tabs) {
    const urlSet = new Set(tabs.map(tab => tab.url));
    return urlSet.size > 1;
  }

  isAlreadyInSameUrlAndTitle(title, sameUrlAndTitle) {
    return sameUrlAndTitle.some(item => item.title === title);
  }

  sortByCount(items) {
    return items.sort((a, b) => b.count - a.count);
  }
  
  analyzeDomains() {
    this.allTabs.forEach(tab => {
      if (tab.url) {
        const domain = this.extractDomain(tab.url);
        if (domain) {
          this.addTabToDomain(domain, tab);
        }
      }
    });
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  addTabToDomain(domain, tab) {
    if (!this.domainData[domain]) {
      this.domainData[domain] = {
        count: 0,
        favIconUrl: null,
        tabs: []
      };
    }
    
    this.domainData[domain].count++;
    
    if (!this.domainData[domain].favIconUrl && tab.favIconUrl) {
      this.domainData[domain].favIconUrl = tab.favIconUrl;
    }
    
    this.domainData[domain].tabs.push(this.createTabInfo(tab));
  }

  getSortedDomains() {
    return Object.entries(this.domainData)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([domain, data]) => ({ 
        domain, 
        count: data.count,
        favIconUrl: data.favIconUrl,
        tabs: data.tabs
      }));
  }
  
  async analyze() {
    await this.initialize();
    const duplicates = this.categorizeDuplicates();
    
    return {
      totalTabs: this.allTabs.length,
      totalWindows: this.allWindows.length,
      ...duplicates,
      tabsPerDomain: this.getSortedDomains()
    };
  }
}

async function analyzeAllTabs() {
  const analyzer = new TabAnalyzer();
  return await analyzer.analyze();
}

export { analyzeAllTabs };