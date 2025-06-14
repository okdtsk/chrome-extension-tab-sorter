function saveOptions() {
  const sortType = document.getElementById('sortType').value;
  const sortOrder = document.getElementById('sortOrder').value;
  
  chrome.storage.sync.set({
    sortType: sortType,
    sortOrder: sortOrder
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Settings updated';
    status.style.opacity = '1';
    setTimeout(() => {
      status.style.opacity = '0';
    }, 1000);
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    sortType: 'url',
    sortOrder: 'ascending'
  }, (items) => {
    document.getElementById('sortType').value = items.sortType;
    document.getElementById('sortOrder').value = items.sortOrder;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  
  // Add change listeners to select elements
  document.getElementById('sortType').addEventListener('change', saveOptions);
  document.getElementById('sortOrder').addEventListener('change', saveOptions);
});