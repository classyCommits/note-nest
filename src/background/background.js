/**
 * @file background.js
 * @description Background service worker for NoteNest. Handles installation,
 * side panel behavior, and global keyboard shortcuts.
 * @version 1.1
 * @date 2026-03-23
 */

// Open the side panel when the extension icon is clicked.
// NOTE: This must be registered at the top level, NOT inside onInstalled,
// because onInstalled only fires once on install/update — not on every click.
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
});

// Runs once when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(async () => {

  try {
    const result = await chrome.storage.local.get('settings');
    if (!result.settings) {
      await chrome.storage.local.set({
        settings: {
          fontSize: '14',
          autoSave: true,
          confirmDelete: true
        }
      });

    }
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
});
  

// Listens for global keyboard shortcuts defined in manifest.json.
chrome.commands.onCommand.addListener(async (command, tab) => {
  // tab can be undefined if shortcut fired from chrome:// pages or DevTools
  if (!tab?.windowId) {
    console.warn('Shortcut fired with no active tab — cannot open side panel.');
    return;
  }

  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });

    // Small delay to ensure the side panel is ready to receive messages.
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: command }, () => {
        if (chrome.runtime.lastError) {
          // Keep this specific warn as it helps debug message-passing failures
          console.warn('Could not send shortcut message:', chrome.runtime.lastError.message);
        }
      });
    }, 150);
  } catch (error) {
    console.error('Error handling shortcut:', error);
  }
});