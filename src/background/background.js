/**
 * @file background.js
 * @description Background service worker for NoteNest. Handles installation,
 * side panel behavior, and global keyboard shortcuts.
 * @version 1.0
 * @date 2025-08-12
 */

// This listener runs once when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(() => {
  console.log('NoteNest extension installed/updated');

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
  });

  // Initialize default settings on first install.
  chrome.storage.local.get('settings', (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting settings:', chrome.runtime.lastError);
      return;
    }
    
    // If no settings exist, create them.
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          fontSize: '14',
          autoSave: true
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


// This function initializes the listener for global keyboard shortcuts.
const initializeCommands = () => {
if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener(async (command, tab) => {
    console.log('Keyboard shortcut triggered:', command);
    
    try {
      // First, open the side panel.
      await chrome.sidePanel.open({ windowId: tab.windowId });
      
      // Then, send a message to the side panel with the command name.
      // A small delay ensures the panel is ready to receive the message.
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: command }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending shortcut message:', chrome.runtime.lastError.message);
          }
        });
      }, 100);
    } catch (error) {
      console.error('Error opening side panel from shortcut:', error);
    }
  });
  console.log('Commands API listener initialized successfully');
} else {
  console.warn('Commands API not available');
}
};

// Start the command listener.
initializeCommands();