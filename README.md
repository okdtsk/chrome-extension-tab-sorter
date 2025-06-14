# Tab Sorter

A Chrome extension to organize all tabs with sorting and gathering functionality.

## Features

- **Sort Tabs**: Sort all tabs in the current window based on URL or title
- **Gather Tabs**: Organize tabs by grouping related ones together
- **Tab Statistics**: View information about your current tabs
- **Configurable Options**: Customize sorting preferences

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The Tab Sorter icon should appear in your Chrome toolbar

## Usage

1. Click the Tab Sorter icon in the Chrome toolbar
2. A popup window will appear with the following options:
   - **Sort Tabs**: Click to sort all tabs in the current window
   - **Gather Tabs**: Click to group related tabs together
   - View tab statistics below the action buttons

## Configuration

Access the extension options by:
1. Right-clicking the Tab Sorter icon
2. Selecting "Options" from the context menu

### Available Settings

- **Sort Type**:
  - Based on URL
  - Based on Title
- **Sort Order**:
  - Ascending
  - Descending

## Permissions

This extension requires the following Chrome permissions:
- `tabs`: To access and manipulate browser tabs
- `tabGroups`: To create and manage tab groups
- `storage`: To save user preferences

## Development

The extension consists of the following key files:
- `manifest.json`: Extension configuration
- `popup.html/js`: Main popup interface
- `options.html/js`: Settings page
- `background.js`: Background service worker
- `sortTabs.js`: Tab sorting functionality
- `gatherTabs.js`: Tab gathering functionality
- `tabAnalyzer.js`: Tab analysis and statistics

## Version

Current version: 1.0.0