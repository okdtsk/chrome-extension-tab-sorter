import { sortTabs } from './sortTabs.js';
import { gatherTabsToCurrentWindow } from './gatherTabs.js';
import { analyzeAllTabs } from './tabAnalyzer.js';

// Store stats globally for click handlers
let currentStats = null;

// Load and display tab statistics
async function loadStatistics() {
  try {
    const stats = await analyzeAllTabs();
    currentStats = stats;
    
    // Hide loading message and show content
    document.getElementById('stats-loading').style.display = 'none';
    document.getElementById('stats-content').style.display = 'block';
    
    // Display duplicate URLs
    const duplicateUrlsEl = document.getElementById('duplicate-urls');
    if (stats.duplicateUrls.length > 0) {
      duplicateUrlsEl.innerHTML = stats.duplicateUrls
        .slice(0, 5) // Show top 5
        .map((item, index) => {
          const truncatedUrl = item.url.length > 50 
            ? item.url.substring(0, 50) + '...' 
            : item.url;
          return `<div class="stat-item">
            <span class="stat-count">${item.count}x</span>
            <span class="stat-text" title="${item.url}">${truncatedUrl}</span>
          </div>`;
        }).join('');
        
      if (stats.duplicateUrls.length > 5) {
        duplicateUrlsEl.innerHTML += `<div class="stat-more">...and ${stats.duplicateUrls.length - 5} more</div>`;
      }
    } else {
      duplicateUrlsEl.innerHTML = '<div class="stat-empty">No duplicate URLs found</div>';
    }
    
    // Display duplicate titles
    const duplicateTitlesEl = document.getElementById('duplicate-titles');
    if (stats.duplicateTitles.length > 0) {
      duplicateTitlesEl.innerHTML = stats.duplicateTitles
        .slice(0, 5) // Show top 5
        .map((item, index) => {
          const truncatedTitle = item.title.length > 50 
            ? item.title.substring(0, 50) + '...' 
            : item.title;
          return `<div class="stat-item">
            <span class="stat-count">${item.count}x</span>
            <span class="stat-text" title="${item.title}">${truncatedTitle}</span>
          </div>`;
        }).join('');
        
      if (stats.duplicateTitles.length > 5) {
        duplicateTitlesEl.innerHTML += `<div class="stat-more">...and ${stats.duplicateTitles.length - 5} more</div>`;
      }
    } else {
      duplicateTitlesEl.innerHTML = '<div class="stat-empty">No duplicate titles found</div>';
    }
    
    // Display tabs per domain
    const domainCountsEl = document.getElementById('domain-counts');
    if (stats.tabsPerDomain.length > 0) {
      domainCountsEl.innerHTML = stats.tabsPerDomain
        .slice(0, 10) // Show top 10 domains
        .map(item => `<div class="stat-item">
          <span class="stat-count">${item.count}</span>
          <span class="stat-text">${item.domain}</span>
        </div>`).join('');
        
      if (stats.tabsPerDomain.length > 10) {
        domainCountsEl.innerHTML += `<div class="stat-more">...and ${stats.tabsPerDomain.length - 10} more domains</div>`;
      }
    } else {
      domainCountsEl.innerHTML = '<div class="stat-empty">No tabs found</div>';
    }
    
    // Update header with total count
    const statsHeader = document.querySelector('.statistics h3');
    statsHeader.textContent = `Tab Statistics (${stats.totalTabs} tabs in ${stats.totalWindows} windows)`;
    
    
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

// Load statistics when popup opens
document.addEventListener('DOMContentLoaded', loadStatistics);