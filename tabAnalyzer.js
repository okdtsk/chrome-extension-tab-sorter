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
  
  // Analyze duplicate URLs
  const urlCounts = {};
  const duplicateUrls = [];
  
  allTabs.forEach(tab => {
    if (tab.url) {
      if (!urlCounts[tab.url]) {
        urlCounts[tab.url] = { count: 0, tabs: [] };
      }
      urlCounts[tab.url].count++;
      urlCounts[tab.url].tabs.push({
        id: tab.id,
        title: tab.title,
        windowId: tab.windowId
      });
    }
  });
  
  // Find URLs that appear more than once
  for (const [url, data] of Object.entries(urlCounts)) {
    if (data.count > 1) {
      duplicateUrls.push({
        url: url,
        count: data.count,
        tabs: data.tabs
      });
    }
  }
  
  // Analyze duplicate titles
  const titleCounts = {};
  const duplicateTitles = [];
  
  allTabs.forEach(tab => {
    if (tab.title) {
      if (!titleCounts[tab.title]) {
        titleCounts[tab.title] = { count: 0, tabs: [] };
      }
      titleCounts[tab.title].count++;
      titleCounts[tab.title].tabs.push({
        id: tab.id,
        url: tab.url,
        windowId: tab.windowId
      });
    }
  });
  
  // Find titles that appear more than once
  for (const [title, data] of Object.entries(titleCounts)) {
    if (data.count > 1) {
      duplicateTitles.push({
        title: title,
        count: data.count,
        tabs: data.tabs
      });
    }
  }
  
  // Analyze tabs per domain
  const domainCounts = {};
  
  allTabs.forEach(tab => {
    if (tab.url) {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname;
        
        if (domain) {
          if (!domainCounts[domain]) {
            domainCounts[domain] = 0;
          }
          domainCounts[domain]++;
        }
      } catch (error) {
        // Invalid URL, skip
      }
    }
  });
  
  // Sort domains by count (highest first)
  const sortedDomains = Object.entries(domainCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([domain, count]) => ({ domain, count }));
  
  return {
    totalTabs: allTabs.length,
    totalWindows: allWindows.length,
    duplicateUrls: duplicateUrls.sort((a, b) => b.count - a.count),
    duplicateTitles: duplicateTitles.sort((a, b) => b.count - a.count),
    tabsPerDomain: sortedDomains
  };
}

export { analyzeAllTabs };