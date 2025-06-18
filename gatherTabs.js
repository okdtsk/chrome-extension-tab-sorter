class TabGatherer {
  constructor() {
    this.currentWindow = null;
    this.allWindows = [];
    this.otherWindows = [];
    this.groupIdMap = new Map();
  }

  async initialize() {
    this.currentWindow = await chrome.windows.getCurrent();
    this.allWindows = await chrome.windows.getAll({ populate: true });
    this.otherWindows = this.allWindows.filter(window => window.id !== this.currentWindow.id);
  }

  hasWindowsToGather() {
    return this.otherWindows.length > 0;
  }
  
  async gatherFromAllWindows() {
    for (const window of this.otherWindows) {
      if (this.hasValidTabs(window)) {
        await this.gatherFromWindow(window);
      }
    }
  }

  hasValidTabs(window) {
    return window.tabs && window.tabs.length > 0;
  }

  async gatherFromWindow(window) {
    const tabGroups = await chrome.tabGroups.query({ windowId: window.id });
    const categorizedTabs = this.categorizeTabs(window.tabs, tabGroups);
    
    await this.movePinnedTabs(categorizedTabs.pinnedTabs);
    await this.moveGroupedTabs(categorizedTabs.tabsByGroup);
    await this.moveUngroupedTabs(categorizedTabs.ungroupedTabs);
  }

  categorizeTabs(tabs, tabGroups) {
    const tabsByGroup = {};
    const ungroupedTabs = [];
    const pinnedTabs = [];
    
    for (const tab of tabs) {
      if (tab.pinned) {
        pinnedTabs.push(tab);
      } else if (tab.groupId === -1) {
        ungroupedTabs.push(tab);
      } else {
        this.addTabToGroup(tab, tabsByGroup, tabGroups);
      }
    }
    
    return { tabsByGroup, ungroupedTabs, pinnedTabs };
  }

  addTabToGroup(tab, tabsByGroup, tabGroups) {
    if (!tabsByGroup[tab.groupId]) {
      tabsByGroup[tab.groupId] = {
        tabs: [],
        groupInfo: tabGroups.find(g => g.id === tab.groupId)
      };
    }
    tabsByGroup[tab.groupId].tabs.push(tab);
  }
    
  async movePinnedTabs(pinnedTabs) {
    for (const tab of pinnedTabs) {
      await this.moveTabSafely(tab, 'pinned');
    }
  }

  async moveTabSafely(tab, tabType) {
    try {
      await chrome.tabs.move(tab.id, {
        windowId: this.currentWindow.id,
        index: -1
      });
    } catch (error) {
      console.error(`Failed to move ${tabType} tab ${tab.id}:`, error);
    }
  }
    
  async moveGroupedTabs(tabsByGroup) {
    for (const [oldGroupId, groupData] of Object.entries(tabsByGroup)) {
      const { tabs: groupTabs, groupInfo } = groupData;
      
      const sortedTabs = this.sortTabsByIndex(groupTabs);
      const movedTabIds = await this.moveTabsFromGroup(sortedTabs);
      
      if (movedTabIds.length > 0 && groupInfo) {
        await this.recreateTabGroup(oldGroupId, movedTabIds, groupInfo);
      }
    }
  }

  sortTabsByIndex(tabs) {
    return tabs.sort((a, b) => a.index - b.index);
  }

  async moveTabsFromGroup(tabs) {
    const movedTabIds = [];
    
    for (const tab of tabs) {
      try {
        await chrome.tabs.move(tab.id, {
          windowId: this.currentWindow.id,
          index: -1
        });
        movedTabIds.push(tab.id);
      } catch (error) {
        console.error(`Failed to move tab ${tab.id}:`, error);
      }
    }
    
    return movedTabIds;
  }

  async recreateTabGroup(oldGroupId, movedTabIds, groupInfo) {
    try {
      const oldGroupIdInt = parseInt(oldGroupId);
      let newGroupId;
      
      if (this.groupIdMap.has(oldGroupIdInt)) {
        newGroupId = this.groupIdMap.get(oldGroupIdInt);
        await this.addTabsToExistingGroup(movedTabIds, newGroupId);
      } else {
        newGroupId = await this.createNewGroup(movedTabIds, groupInfo);
        this.groupIdMap.set(oldGroupIdInt, newGroupId);
      }
    } catch (error) {
      console.error(`Failed to recreate group for tabs:`, error);
    }
  }

  async createNewGroup(tabIds, groupInfo) {
    const newGroupId = await chrome.tabs.group({
      tabIds: tabIds,
      createProperties: {
        windowId: this.currentWindow.id
      }
    });
    
    await chrome.tabGroups.update(newGroupId, {
      collapsed: groupInfo.collapsed,
      color: groupInfo.color,
      title: groupInfo.title
    });
    
    return newGroupId;
  }

  async addTabsToExistingGroup(tabIds, groupId) {
    await chrome.tabs.group({
      tabIds: tabIds,
      groupId: groupId
    });
  }
    
  async moveUngroupedTabs(ungroupedTabs) {
    for (const tab of ungroupedTabs) {
      await this.moveTabSafely(tab, 'ungrouped');
    }
  }

  async gather() {
    await this.initialize();
    
    if (!this.hasWindowsToGather()) {
      return;
    }
    
    await this.gatherFromAllWindows();
  }
}

async function gatherTabsToCurrentWindow() {
  const gatherer = new TabGatherer();
  await gatherer.gather();
}

export { gatherTabsToCurrentWindow };