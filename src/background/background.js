/**
 * @file background.js
 * @description Background service worker for NoteNest. Handles installation,
 * side panel behavior, and global keyboard shortcuts.
 * @version 1.1
 * @date 2025-08-12
 */

// Open the side panel when the extension icon is clicked.
// NOTE: This must be registered at the top level, NOT inside onInstalled,
// because onInstalled only fires once on install/update — not on every click.
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Runs once when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(() => {
  console.log('NoteNest extension installed/updated');

  // Initialize default settings on first install only.
  chrome.storage.local.get('settings', (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting settings:', chrome.runtime.lastError);
      return;
    }

    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          fontSize: '14',
          autoSave: true,
          confirmDelete: true
        }
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error setting default settings:', chrome.runtime.lastError);
        } else {
          console.log('Default settings initialized');
        }
      });
    }
  });
});

// Listens for global keyboard shortcuts defined in manifest.json.
if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener(async (command, tab) => {
    console.log('Keyboard shortcut triggered:', command);

    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });

      // Small delay to ensure the side panel is ready to receive messages.
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: command }, (response) => {
          if (chrome.runtime.lastError) {
            // This error is expected if the panel isn't open yet; safe to ignore.
            console.warn('Could not send shortcut message:', chrome.runtime.lastError.message);
          }
        });
      }, 150);
    } catch (error) {
      console.error('Error handling shortcut:', error);
    }
  });
  console.log('Commands listener registered');
} else {
  console.warn('chrome.commands API not available');
}