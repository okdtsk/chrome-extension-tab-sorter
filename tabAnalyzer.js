async function analyzeAllTabs() {
  // Get all windows with their tabs
  const allWindows = await chrome.windows.getAll({ populate: true });
  
  // Collect all tabs from all windows
  const allTabs = [];
  for (const window of allWindows) {
    if (window.tabs) {
      allTabs.push(...window.tabs);
    }
  }
  
  // Analyze duplicates and categorize them
  const urlGroups = {};
  const titleGroups = {};
  
  // Group tabs by URL
  allTabs.forEach(tab => {
    if (tab.url) {
      if (!urlGroups[tab.url]) {
        urlGroups[tab.url] = [];
      }
      urlGroups[tab.url].push({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        windowId: tab.windowId,
        favIconUrl: tab.favIconUrl || null,
        lastAccessed: tab.lastAccessed || null
      });
    }
  });
  
  // Group tabs by title
  allTabs.forEach(tab => {
    if (tab.title) {
      if (!titleGroups[tab.title]) {
        titleGroups[tab.title] = [];
      }
      titleGroups[tab.title].push({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        windowId: tab.windowId,
        favIconUrl: tab.favIconUrl || null,
        lastAccessed: tab.lastAccessed || null
      });
    }
  });
  
  // Categorize duplicates
  const sameUrlAndTitle = [];
  const sameUrlDifferentTitle = [];
  const sameTitleDifferentUrl = [];
  
  // Find tabs with same URL
  for (const [url, tabs] of Object.entries(urlGroups)) {
    if (tabs.length > 1) {
      // Check if all tabs have the same title
      const firstTitle = tabs[0].title;
      const allSameTitle = tabs.every(tab => tab.title === firstTitle);
      
      if (allSameTitle) {
        sameUrlAndTitle.push({
          url: url,
          title: firstTitle,
          count: tabs.length,
          tabs: tabs,
          favIconUrl: tabs[0].favIconUrl
        });
      } else {
        // Group by different titles for the same URL
        const titleMap = {};
        tabs.forEach(tab => {
          if (!titleMap[tab.title]) {
            titleMap[tab.title] = 0;
          }
          titleMap[tab.title]++;
        });
        
        sameUrlDifferentTitle.push({
          url: url,
          count: tabs.length,
          titles: Object.keys(titleMap),
          tabs: tabs,
          favIconUrl: tabs[0].favIconUrl
        });
      }
    }
  }
  
  // Find tabs with same title but different URLs
  for (const [title, tabs] of Object.entries(titleGroups)) {
    if (tabs.length > 1) {
      // Check if any have different URLs
      const urlSet = new Set(tabs.map(tab => tab.url));
      if (urlSet.size > 1) {
        // Only include if not already in sameUrlAndTitle
        const isInSameUrlAndTitle = sameUrlAndTitle.some(item => item.title === title);
        if (!isInSameUrlAndTitle) {
          sameTitleDifferentUrl.push({
            title: title,
            count: tabs.length,
            urls: Array.from(urlSet),
            tabs: tabs,
            favIconUrl: tabs[0].favIconUrl
          });
        }
      }
    }
  }
  
  // Analyze tabs per domain
  const domainData = {};
  
  allTabs.forEach(tab => {
    if (tab.url) {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname;
        
        if (domain) {
          if (!domainData[domain]) {
            domainData[domain] = {
              count: 0,
              favIconUrl: null,
              tabs: []
            };
          }
          domainData[domain].count++;
          // Store the first non-null favicon found for this domain
          if (!domainData[domain].favIconUrl && tab.favIconUrl) {
            domainData[domain].favIconUrl = tab.favIconUrl;
          }
          // Store tab information
          domainData[domain].tabs.push({
            id: tab.id,
            title: tab.title,
            url: tab.url,
            windowId: tab.windowId,
            favIconUrl: tab.favIconUrl || null,
            lastAccessed: tab.lastAccessed || null
          });
        }
      } catch (error) {
        // Invalid URL, skip
      }
    }
  });
  
  // Sort domains by count (highest first)
  const sortedDomains = Object.entries(domainData)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([domain, data]) => ({ 
      domain, 
      count: data.count,
      favIconUrl: data.favIconUrl,
      tabs: data.tabs
    }));
  
  return {
    totalTabs: allTabs.length,
    totalWindows: allWindows.length,
    sameUrlAndTitle: sameUrlAndTitle.sort((a, b) => b.count - a.count),
    sameUrlDifferentTitle: sameUrlDifferentTitle.sort((a, b) => b.count - a.count),
    sameTitleDifferentUrl: sameTitleDifferentUrl.sort((a, b) => b.count - a.count),
    tabsPerDomain: sortedDomains
  };
}

export { analyzeAllTabs };