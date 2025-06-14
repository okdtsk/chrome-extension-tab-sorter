async function gatherTabsToCurrentWindow() {
  // Get the current window (where the extension was clicked)
  const currentWindow = await chrome.windows.getCurrent();
  
  // Get all windows
  const allWindows = await chrome.windows.getAll({ populate: true });
  
  // Filter out the current window
  const otherWindows = allWindows.filter(window => window.id !== currentWindow.id);
  
  // If there are no other windows, nothing to gather
  if (otherWindows.length === 0) {
    return;
  }
  
  // Map to track old groupId to new groupId mappings
  const groupIdMap = new Map();
  
  // Gather tabs from other windows while preserving groups
  for (const window of otherWindows) {
    // Skip if window has no tabs
    if (!window.tabs || window.tabs.length === 0) {
      continue;
    }
    
    // Get all tab groups in this window
    const tabGroups = await chrome.tabGroups.query({ windowId: window.id });
    
    // Group tabs by their groupId
    const tabsByGroup = {};
    const ungroupedTabs = [];
    const pinnedTabs = [];
    
    for (const tab of window.tabs) {
      if (tab.pinned) {
        pinnedTabs.push(tab);
      } else if (tab.groupId === -1) {
        ungroupedTabs.push(tab);
      } else {
        if (!tabsByGroup[tab.groupId]) {
          tabsByGroup[tab.groupId] = {
            tabs: [],
            groupInfo: tabGroups.find(g => g.id === tab.groupId)
          };
        }
        tabsByGroup[tab.groupId].tabs.push(tab);
      }
    }
    
    // Move pinned tabs first
    for (const tab of pinnedTabs) {
      try {
        await chrome.tabs.move(tab.id, {
          windowId: currentWindow.id,
          index: -1
        });
      } catch (error) {
        console.error(`Failed to move pinned tab ${tab.id}:`, error);
      }
    }
    
    // Move grouped tabs and recreate their groups
    for (const [oldGroupId, groupData] of Object.entries(tabsByGroup)) {
      const { tabs: groupTabs, groupInfo } = groupData;
      
      // Sort tabs by index to maintain their order
      groupTabs.sort((a, b) => a.index - b.index);
      
      // Move all tabs in the group to the current window
      const movedTabIds = [];
      for (const tab of groupTabs) {
        try {
          await chrome.tabs.move(tab.id, {
            windowId: currentWindow.id,
            index: -1
          });
          movedTabIds.push(tab.id);
        } catch (error) {
          console.error(`Failed to move tab ${tab.id}:`, error);
        }
      }
      
      // If we successfully moved tabs, recreate the group
      if (movedTabIds.length > 0 && groupInfo) {
        try {
          // Check if we already created this group in the destination window
          let newGroupId;
          
          if (groupIdMap.has(parseInt(oldGroupId))) {
            // Use existing group
            newGroupId = groupIdMap.get(parseInt(oldGroupId));
          } else {
            // Create new group with the same properties
            newGroupId = await chrome.tabs.group({
              tabIds: movedTabIds,
              createProperties: {
                windowId: currentWindow.id
              }
            });
            
            // Update the group with the original properties
            await chrome.tabGroups.update(newGroupId, {
              collapsed: groupInfo.collapsed,
              color: groupInfo.color,
              title: groupInfo.title
            });
            
            groupIdMap.set(parseInt(oldGroupId), newGroupId);
          }
          
          // If we're adding to an existing group, add the tabs
          if (movedTabIds.length > 0 && groupIdMap.has(parseInt(oldGroupId))) {
            await chrome.tabs.group({
              tabIds: movedTabIds,
              groupId: newGroupId
            });
          }
        } catch (error) {
          console.error(`Failed to recreate group for tabs:`, error);
        }
      }
    }
    
    // Move ungrouped tabs
    for (const tab of ungroupedTabs) {
      try {
        await chrome.tabs.move(tab.id, {
          windowId: currentWindow.id,
          index: -1
        });
      } catch (error) {
        console.error(`Failed to move ungrouped tab ${tab.id}:`, error);
      }
    }
  }
}

export { gatherTabsToCurrentWindow };