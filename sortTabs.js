async function sortTabs() {
  const config = await chrome.storage.sync.get({
    sortType: 'url',
    sortOrder: 'ascending'
  });

  const currentWindow = await chrome.windows.getCurrent();
  const tabs = await chrome.tabs.query({ windowId: currentWindow.id });

  // Separate pinned tabs (they should always stay at the beginning)
  const pinnedTabs = [];
  const unpinnedTabs = [];
  
  tabs.forEach(tab => {
    if (tab.pinned) {
      pinnedTabs.push(tab);
    } else {
      unpinnedTabs.push(tab);
    }
  });

  // Group unpinned tabs by their groupId (-1 means no group)
  const tabsByGroup = {};
  const ungroupedTabs = [];
  
  unpinnedTabs.forEach(tab => {
    if (tab.groupId === -1) {
      ungroupedTabs.push(tab);
    } else {
      if (!tabsByGroup[tab.groupId]) {
        tabsByGroup[tab.groupId] = [];
      }
      tabsByGroup[tab.groupId].push(tab);
    }
  });

  // Get tab group information
  const groupInfoMap = {};
  if (Object.keys(tabsByGroup).length > 0) {
    const groups = await chrome.tabGroups.query({ windowId: currentWindow.id });
    groups.forEach(group => {
      groupInfoMap[group.id] = group;
    });
  }

  // Sort tab groups by color and then by title
  const sortedGroupIds = Object.keys(tabsByGroup)
    .map(id => parseInt(id))
    .sort((a, b) => {
      const groupA = groupInfoMap[a];
      const groupB = groupInfoMap[b];
      
      if (!groupA || !groupB) return 0;
      
      // First sort by color
      const colorCompare = groupA.color.localeCompare(groupB.color);
      if (colorCompare !== 0) return colorCompare;
      
      // Then sort by title
      return groupA.title.localeCompare(groupB.title);
    });

  // Helper function to sort tabs
  const sortTabsArray = (tabsArray) => {
    return [...tabsArray].sort((a, b) => {
      let compareValue;
      
      if (config.sortType === 'url') {
        compareValue = a.url.localeCompare(b.url);
      } else {
        compareValue = a.title.localeCompare(b.title);
      }

      return config.sortOrder === 'ascending' ? compareValue : -compareValue;
    });
  };

  // Sort ungrouped tabs
  const sortedUngroupedTabs = sortTabsArray(ungroupedTabs);

  // Build the complete final order
  const finalTabOrder = [];
  
  // First, keep pinned tabs at the very beginning (they don't get sorted)
  finalTabOrder.push(...pinnedTabs.map(tab => ({
    id: tab.id,
    groupId: tab.groupId,
    targetGroupId: tab.groupId,
    pinned: true
  })));
  
  // Then add all grouped tabs (maintaining group order)
  for (const groupId of sortedGroupIds) {
    const sortedGroupTabs = sortTabsArray(tabsByGroup[groupId]);
    finalTabOrder.push(...sortedGroupTabs.map(tab => ({
      id: tab.id,
      groupId: tab.groupId,
      targetGroupId: tab.groupId // Important: preserve the group assignment
    })));
  }
  
  // Finally add ungrouped tabs at the end
  finalTabOrder.push(...sortedUngroupedTabs.map(tab => ({
    id: tab.id,
    groupId: -1,
    targetGroupId: -1
  })));

  // Strategy: Move tabs in a way that preserves groups
  // We'll use a temporary holding position at the end to avoid breaking groups
  const totalTabs = tabs.length;
  
  // Step 1: Move all tabs that need to be moved to temporary positions at the end
  // This prevents breaking groups during intermediate moves
  const tempPositions = [];
  for (let i = 0; i < finalTabOrder.length; i++) {
    const targetTab = finalTabOrder[i];
    const currentTab = tabs.find(t => t.id === targetTab.id);
    
    if (currentTab && currentTab.index !== i) {
      // Move to temporary position at the end
      const tempIndex = totalTabs + tempPositions.length;
      await chrome.tabs.move(targetTab.id, { index: -1 }); // -1 moves to end
      tempPositions.push({
        ...targetTab,
        tempIndex: tempIndex
      });
    }
  }

  // Step 2: Move tabs from temporary positions to their final positions
  // Moving from right to left to maintain correct indices
  for (let i = 0; i < finalTabOrder.length; i++) {
    const targetTab = finalTabOrder[i];
    const isInTempPosition = tempPositions.find(t => t.id === targetTab.id);
    
    if (isInTempPosition) {
      await chrome.tabs.move(targetTab.id, { index: i });
    }
  }

  // Step 3: Verify and fix any tabs that lost their group
  // Sometimes Chrome removes tabs from groups during moves, so we need to re-add them
  const finalTabs = await chrome.tabs.query({ windowId: currentWindow.id });
  
  for (const originalTab of tabs) {
    if (originalTab.groupId !== -1) {
      const currentTab = finalTabs.find(t => t.id === originalTab.id);
      
      if (currentTab && currentTab.groupId !== originalTab.groupId) {
        // Tab lost its group, re-add it
        await chrome.tabs.group({
          tabIds: [currentTab.id],
          groupId: originalTab.groupId
        });
      }
    }
  }
}

export { sortTabs };