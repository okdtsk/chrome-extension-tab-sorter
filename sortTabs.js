class TabSorter {
  constructor() {
    this.config = null;
    this.currentWindow = null;
    this.tabs = [];
    this.pinnedTabs = [];
    this.unpinnedTabs = [];
    this.tabsByGroup = {};
    this.ungroupedTabs = [];
    this.groupInfoMap = {};
  }

  async initialize() {
    this.config = await chrome.storage.sync.get({
      sortType: 'url',
      sortOrder: 'ascending'
    });

    this.currentWindow = await chrome.windows.getCurrent();
    this.tabs = await chrome.tabs.query({ windowId: this.currentWindow.id });
    
    this.separatePinnedTabs();
    this.groupTabsByGroup();
    await this.loadGroupInfo();
  }

  separatePinnedTabs() {
    this.tabs.forEach(tab => {
      if (tab.pinned) {
        this.pinnedTabs.push(tab);
      } else {
        this.unpinnedTabs.push(tab);
      }
    });
  }

  groupTabsByGroup() {
    this.unpinnedTabs.forEach(tab => {
      if (tab.groupId === -1) {
        this.ungroupedTabs.push(tab);
      } else {
        if (!this.tabsByGroup[tab.groupId]) {
          this.tabsByGroup[tab.groupId] = [];
        }
        this.tabsByGroup[tab.groupId].push(tab);
      }
    });
  }

  async loadGroupInfo() {
    if (Object.keys(this.tabsByGroup).length > 0) {
      const groups = await chrome.tabGroups.query({ windowId: this.currentWindow.id });
      groups.forEach(group => {
        this.groupInfoMap[group.id] = group;
      });
    }
  }

  getSortedGroupIds() {
    return Object.keys(this.tabsByGroup)
      .map(id => parseInt(id))
      .sort((a, b) => this.compareGroups(a, b));
  }

  compareGroups(groupIdA, groupIdB) {
    const groupA = this.groupInfoMap[groupIdA];
    const groupB = this.groupInfoMap[groupIdB];
    
    if (!groupA || !groupB) return 0;
    
    const colorCompare = groupA.color.localeCompare(groupB.color);
    if (colorCompare !== 0) return colorCompare;
    
    return groupA.title.localeCompare(groupB.title);
  }

  sortTabsArray(tabsArray) {
    return [...tabsArray].sort((a, b) => {
      const compareValue = this.config.sortType === 'url' 
        ? a.url.localeCompare(b.url)
        : a.title.localeCompare(b.title);

      return this.config.sortOrder === 'ascending' ? compareValue : -compareValue;
    });
  }

  buildFinalTabOrder() {
    const finalTabOrder = [];
    const sortedGroupIds = this.getSortedGroupIds();
    const sortedUngroupedTabs = this.sortTabsArray(this.ungroupedTabs);
    
    this.addPinnedTabs(finalTabOrder);
    this.addGroupedTabs(finalTabOrder, sortedGroupIds);
    this.addUngroupedTabs(finalTabOrder, sortedUngroupedTabs);
    
    return finalTabOrder;
  }

  addPinnedTabs(finalTabOrder) {
    finalTabOrder.push(...this.pinnedTabs.map(tab => ({
      id: tab.id,
      groupId: tab.groupId,
      targetGroupId: tab.groupId,
      pinned: true
    })));
  }

  addGroupedTabs(finalTabOrder, sortedGroupIds) {
    for (const groupId of sortedGroupIds) {
      const sortedGroupTabs = this.sortTabsArray(this.tabsByGroup[groupId]);
      finalTabOrder.push(...sortedGroupTabs.map(tab => ({
        id: tab.id,
        groupId: tab.groupId,
        targetGroupId: tab.groupId
      })));
    }
  }

  addUngroupedTabs(finalTabOrder, sortedUngroupedTabs) {
    finalTabOrder.push(...sortedUngroupedTabs.map(tab => ({
      id: tab.id,
      groupId: -1,
      targetGroupId: -1
    })));
  }

  async performTabMovement(finalTabOrder) {
    const tempPositions = await this.moveTabsToTemporaryPositions(finalTabOrder);
    await this.moveTabsToFinalPositions(finalTabOrder, tempPositions);
    await this.fixLostGroupAssignments();
  }

  async moveTabsToTemporaryPositions(finalTabOrder) {
    const tempPositions = [];
    
    for (let i = 0; i < finalTabOrder.length; i++) {
      const targetTab = finalTabOrder[i];
      const currentTab = this.tabs.find(t => t.id === targetTab.id);
      
      if (currentTab && currentTab.index !== i) {
        await chrome.tabs.move(targetTab.id, { index: -1 });
        tempPositions.push({
          ...targetTab,
          tempIndex: this.tabs.length + tempPositions.length
        });
      }
    }
    
    return tempPositions;
  }

  async moveTabsToFinalPositions(finalTabOrder, tempPositions) {
    for (let i = 0; i < finalTabOrder.length; i++) {
      const targetTab = finalTabOrder[i];
      const isInTempPosition = tempPositions.find(t => t.id === targetTab.id);
      
      if (isInTempPosition) {
        await chrome.tabs.move(targetTab.id, { index: i });
      }
    }
  }

  async fixLostGroupAssignments() {
    const finalTabs = await chrome.tabs.query({ windowId: this.currentWindow.id });
    
    for (const originalTab of this.tabs) {
      if (originalTab.groupId !== -1) {
        const currentTab = finalTabs.find(t => t.id === originalTab.id);
        
        if (currentTab && currentTab.groupId !== originalTab.groupId) {
          await chrome.tabs.group({
            tabIds: [currentTab.id],
            groupId: originalTab.groupId
          });
        }
      }
    }
  }

  async sort() {
    await this.initialize();
    const finalTabOrder = this.buildFinalTabOrder();
    await this.performTabMovement(finalTabOrder);
  }
}

async function sortTabs() {
  const sorter = new TabSorter();
  await sorter.sort();
}

export { sortTabs };