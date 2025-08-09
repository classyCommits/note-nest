// Single consolidated listener for when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    console.log('QuickNotes extension installed/updated');
  
    // Initialize default settings on first install
    chrome.storage.local.get('settings', (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting settings:', chrome.runtime.lastError);
        return;
      }
      
      if (!result.settings) {
        chrome.storage.local.set({
          settings: {
            theme: 'auto',
            fontSize: '14',
            fontFamily: 'Inter',
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
  
    // Create context menu for quick-saving notes
    chrome.contextMenus.create({
      id: 'quick-note',
      title: 'Save selection to QuickNotes',
      contexts: ['selection']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating context menu:', chrome.runtime.lastError);
      } else {
        console.log('Context menu created successfully');
      }
    });
  });
  
  // Set up side panel behavior - this should be called once
  try {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.error('Error setting panel behavior:', error);
  }
  
  // Single listener for all incoming messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request.action);
  
    switch (request.action) {
      case 'get-page-info':
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            console.error('Error querying tabs:', chrome.runtime.lastError);
            sendResponse({ error: chrome.runtime.lastError.message });
            return;
          }
          
          if (tabs[0]) {
            sendResponse({
              title: tabs[0].title,
              url: tabs[0].url
            });
          } else {
            sendResponse({ error: 'No active tab found' });
          }
        });
        return true; // Indicates an asynchronous response
  
      case 'export-notes':
        chrome.storage.local.get(['notes', 'settings'], (result) => {
          if (chrome.runtime.lastError) {
            console.error('Error getting data for export:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
  
          const exportData = {
            notes: result.notes || [],
            settings: result.settings || {},
            exportDate: new Date().toISOString(),
            version: chrome.runtime.getManifest().version
          };
          
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
          });
          
          const url = URL.createObjectURL(blob);
          const filename = `quicknotes-backup-${new Date().toISOString().split('T')[0]}.json`;
          
          chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
          }, (downloadId) => {
            if (chrome.runtime.lastError) {
              console.error('Error downloading file:', chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              console.log('Export successful, download ID:', downloadId);
              sendResponse({ success: true, downloadId });
              // Clean up the blob URL
              URL.revokeObjectURL(url);
            }
          });
        });
        return true;
  
      case 'import-notes':
        const { importData } = request;
        
        if (!importData) {
          sendResponse({ success: false, error: 'No import data provided' });
          return false;
        }
  
        try {
          const data = JSON.parse(importData);
          
          if (!data.notes || !Array.isArray(data.notes)) {
            sendResponse({ success: false, error: 'Invalid backup format: notes must be an array' });
            return false;
          }
  
          chrome.storage.local.get(['notes'], (result) => {
            if (chrome.runtime.lastError) {
              console.error('Error getting existing notes:', chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
  
            const existingNotes = result.notes || [];
            
            // Filter out notes that already exist (by ID)
            const importedNotes = data.notes.filter(note =>
              note.id && !existingNotes.some(existing => existing.id === note.id)
            );
            
            if (importedNotes.length === 0) {
              sendResponse({ success: true, imported: 0, message: 'No new notes to import' });
              return;
            }
  
            // Merge notes (imported notes first to maintain chronological order if desired)
            const mergedNotes = [...existingNotes, ...importedNotes];
            
            chrome.storage.local.set({ notes: mergedNotes }, () => {
              if (chrome.runtime.lastError) {
                console.error('Error saving imported notes:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
              } else {
                console.log(`Successfully imported ${importedNotes.length} notes`);
                sendResponse({
                  success: true,
                  imported: importedNotes.length,
                  total: mergedNotes.length
                });
              }
            });
          });
        } catch (error) {
          console.error('Error parsing import data:', error);
          sendResponse({ success: false, error: 'Failed to parse backup file: ' + error.message });
        }
        return true;
  
      default:
        console.warn('Unknown message action:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
        return false;
    }
  });
  
  // Initialize keyboard shortcuts listener with proper error handling
  const initializeCommands = () => {
    if (chrome.commands && chrome.commands.onCommand) {
      chrome.commands.onCommand.addListener(async (command, tab) => {
        console.log('Keyboard shortcut triggered:', command);
        
        try {
          await chrome.sidePanel.open({ windowId: tab.windowId });
          
          // Small delay to ensure the side panel is ready
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: command }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Error sending shortcut message:', chrome.runtime.lastError);
              }
            });
          }, 100);
        } catch (error) {
          console.error('Error opening side panel from shortcut:', error);
        }
      });
      console.log('Commands API initialized successfully');
    } else {
      console.warn('Commands API not available');
    }
  };
  
  // Initialize commands when the service worker starts
  initializeCommands();
  
  // Initialize context menu listener with proper error handling
  const initializeContextMenu = () => {
    if (chrome.contextMenus && chrome.contextMenus.onClicked) {
      chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        console.log('Context menu clicked:', info.menuItemId);
        
        if (info.menuItemId === 'quick-note' && info.selectionText) {
          try {
            await chrome.sidePanel.open({ windowId: tab.windowId });
            
            // Ensure the side panel is ready to receive the message
            setTimeout(() => {
              chrome.runtime.sendMessage({
                action: 'new-note-with-text',
                text: info.selectionText.trim(),
                pageTitle: tab.title,
                pageUrl: tab.url
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('Error sending context menu message:', chrome.runtime.lastError);
                } else {
                  console.log('Successfully sent selected text to side panel');
                }
              });
            }, 200);
          } catch (error) {
            console.error('Error opening side panel from context menu:', error);
          }
        }
      });
      console.log('Context menu listener initialized successfully');
    } else {
      console.warn('Context menus API not available');
    }
  };
  
  // Initialize context menu listener when the service worker starts
  initializeContextMenu();