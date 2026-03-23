/**
 * @file sidepanel.js
 * @description Main logic for the NoteNest Chrome Extension sidepanel.
 * @version 1.0
 * @date 2025-08-09
 */

class NoteNest {
    /**
     * Initializes the application, sets up properties, and caches DOM elements.
     */
    constructor() {

        this.notes = [];
        this.currentNote = null;
        this.currentFolder = null;
        this.storedSelection = null;
        this.settings = {
            fontSize: '14',
            autoSave: true,
            confirmDelete: true
        };
        this.saveTimeout = null;

        // This will hold all frequently accessed DOM elements.
        this.dom = {};

        this.init();
    }

    /**
     * The main initialization sequence.
     * Caches DOM elements, loads data, sets up listeners, applies settings, and renders the initial view.
     */
    async init() {
        this._cacheDOMElements();
        await this.loadData();
        this._setupEventListeners();
        this.applySettings();
        this.renderNotesList();

        if (this.notes.length === 0) {
            this.createNewNote();
        } else {
            // Load the most recently modified note first.
            const mostRecentNote = this.notes.reduce((a, b) => new Date(b.lastModified) > new Date(a.lastModified) ? b : a);
            this.loadNote(mostRecentNote.id);
        }

        // Render folder list
        this.renderFolderList();
        this.updateFolderSelect();
    }

    /**
     * Caches all required DOM elements into this.dom for efficient access.
     * This avoids repeated `document.getElementById` calls.
     */
    _cacheDOMElements() {
        this.dom.app = document.getElementById('app');
        this.dom.sidebar = document.getElementById('sidebar');

        // Header
        this.dom.toggleSidebarBtn = document.getElementById('toggleSidebarBtn');


        // Sidebar
        this.dom.searchInput = document.getElementById('searchInput');
        this.dom.newNoteBtn = document.getElementById('newNoteBtn');
        this.dom.addFolderBtn = document.getElementById('addFolderBtn');
        this.dom.foldersList = document.getElementById('foldersList');
        this.dom.notesList = document.getElementById('notesList');
        this.dom.folderContextMenu = document.getElementById('folderContextMenu');


        // Editor
        this.dom.editorContainer = document.getElementById('editorContainer');
        this.dom.editorView = document.getElementById('editorView');
        this.dom.folderNotesView = document.getElementById('folderNotesView');
        this.dom.folderNameHeader = document.getElementById('folderNameHeader');
        this.dom.backToEditorBtn = document.getElementById('backToEditorBtn');
        this.dom.folderSearchInput = document.getElementById('folderSearchInput');
        this.dom.folderNotesList = document.getElementById('folderNotesList');
        this.dom.noteTitle = document.getElementById('noteTitle');
        this.dom.editor = document.getElementById('editor');
        this.dom.wordCount = document.getElementById('wordCount');
        this.dom.lastSaved = document.getElementById('lastSaved');
        this.dom.folderSelect = document.getElementById('folderSelect');
        this.dom.tagInput = document.getElementById('tagInput');
        this.dom.addTagBtn = document.getElementById('addTagBtn');
        this.dom.tagsList = document.getElementById('tagsList');
        this.dom.favoriteBtn = document.getElementById('favoriteBtn');

        // Toolbar
        this.dom.toolbar = document.getElementById('toolbar');
        this.dom.fontSizeSelect = document.getElementById('fontSizeSelect');
        this.dom.fontColorBtn = document.getElementById('fontColorBtn');
        this.dom.fontColorPicker = document.getElementById('fontColorPicker');
        this.dom.highlightColorBtn = document.getElementById('highlightColorBtn');
        this.dom.highlightOptions = document.getElementById('highlightOptions');
        // Confirmation modal
        this.dom.confirmationModal = document.getElementById('confirmationModal');
        this.dom.doNotAskAgain = document.getElementById('doNotAskAgain');
        this.dom.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        this.dom.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    }
     
    _setGlobalFontSize(newSize) {
    this.settings.fontSize = String(newSize);
    this.dom.fontSizeDisplay.value = newSize; // Keep display in sync
    this.dom.editor.style.fontSize = `${newSize}px`; // Apply to editor immediately
    this.saveData();
    }


    _setupEventListeners() {
       

        this.dom.toggleSidebarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dom.sidebar.classList.toggle('open');
        });
         
        // Listener for commands from the background script (e.g., keyboard shortcuts)
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'new-note') {
                this.createNewNote();
                sendResponse({ status: "done" });
            } else if (message.action === 'focus-search') {
                this.dom.searchInput.focus();
                sendResponse({ status: "done" });
            }
            return true; // Keep the message channel open for async response
        });
        // Sidebar listeners
        this.dom.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.dom.searchInput.addEventListener('input', this.debounce((e) => this.searchNotes(e.target.value), 300));
        this.dom.addFolderBtn.addEventListener('click', () => this.addFolder());
        this.dom.foldersList.addEventListener('click', (e) => {
            const folderItem = e.target.closest('.folder-item');
            if (folderItem) {
                const folderName = folderItem.dataset.folder;
                if (folderName === 'all') {
                    this.selectFolder(folderName);
                } else {
                    this.showFolderNotes(folderName);
                }
            }
        });

        // Folder view listeners
        this.dom.backToEditorBtn.addEventListener('click', () => this.showEditorView());
        this.dom.folderSearchInput.addEventListener('input', this.debounce((e) => this.searchFolderNotes(e.target.value), 300));

        // Event delegation for folder notes grid — registered once here instead
        // of being re-added inside renderFolderNotesList() on every render call
        this.dom.folderNotesList.addEventListener('click', (e) => {
            const noteCard = e.target.closest('.note-card');
            if (noteCard) {
                this.loadNote(noteCard.dataset.noteId);
                this.showEditorView();
            }
        });

        // Context menu for folder rename (right-click) — registered once here
        // instead of being re-added inside renderFolderList() on every render call
        this.dom.foldersList.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const folderItem = e.target.closest('.folder-item');
            if (folderItem && folderItem.dataset.folder !== 'all') {
                this.showFolderContextMenu(e, folderItem.dataset.folder);
            }
        });
        

        // Use event delegation for notes list to improve performance
        this.dom.notesList.addEventListener('click', (e) => {
            const noteCard = e.target.closest('.note-card');
            const deleteBtn = e.target.closest('.delete-btn');

            if (deleteBtn) {
                e.stopPropagation();
                this.deleteNote(deleteBtn.dataset.noteId);
            } else if (noteCard) {
                this.loadNote(noteCard.dataset.noteId);
            }
        });

        // Editor and Meta listeners
        this.dom.noteTitle.addEventListener('input', () => this._handleNoteUpdate({ title: this.dom.noteTitle.value }));
        this.dom.editor.addEventListener('input', () => this._handleNoteUpdate({ content: this.dom.editor.innerHTML }));
        this.dom.editor.addEventListener('focus', () => this.dom.editor.classList.add('glow-effect'));
        this.dom.editor.addEventListener('blur', () => this.dom.editor.classList.remove('glow-effect'));

        // Add selection change listener to update toolbar button states
        this.dom.editor.addEventListener('mouseup', () => this.updateToolbarButtonStates());
        this.dom.editor.addEventListener('keyup', () => this.updateToolbarButtonStates());
        // Add click event listener for links in the editor
        this.dom.editor.addEventListener('click', (e) => {
            // Check if the clicked element is a link
            if (e.target.tagName === 'A' && e.target.href) {
                e.preventDefault(); // Prevent default behavior
                // Open the link in a new tab
                chrome.tabs.create({ url: e.target.href });
            }
        });

        // Add paste event listener to detect and convert URLs to links
        this.dom.editor.addEventListener('paste', (e) => {
            // Wait for the paste operation to complete
            setTimeout(() => {
                // Get the current content of the editor
                const content = this.dom.editor.innerHTML;

                // Convert URLs to links while preserving existing links
                const newContent = this.convertUrlsToLinks(content);

                // Update the editor content if it changed
                if (newContent !== content) {
                    this.dom.editor.innerHTML = newContent;
                    this._handleNoteUpdate({ content: newContent });
                }
            }, 10);
        });

        this.dom.editor.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                this._handleBackspaceInList(e);
            } else if (e.key === 'Enter') {
                this._handleEnterKey(e);
            }
        });

        this.dom.folderSelect.addEventListener('change', (e) => this._handleNoteUpdate({ folder: e.target.value }));
        this.dom.tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTag();
            }
        });
        this.dom.addTagBtn.addEventListener('click', () => this.addTag());
        this.dom.favoriteBtn.addEventListener('click', () => this.toggleFavorite());

        // Toolbar listeners
        this.dom.toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('[data-command]'); // Simplified selector
            if (!button) return;
        
            const command = button.dataset.command;
        
            if (command) this.execCommand(command);
            // The lines for 'heading' have been completely removed.
        
            this._pulseAnimation(button);
        });

        this.dom.fontSizeSelect.addEventListener('change', (e) => {
            const newSize = e.target.value;
            const selection = window.getSelection();
        
            // Only apply to selection if there's actually selected text
            if (selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
                this._applyFontSizeToSelection(newSize);
                // Don't reset the dropdown - let updateToolbarButtonStates handle it
                setTimeout(() => {
                    this.updateToolbarButtonStates();
                }, 50);
            } else {
                // Reset to current context font size
                setTimeout(() => {
                    this.updateToolbarButtonStates();
                }, 50);
            }
        });

        // Toolbar Color Pickers
        this.dom.fontColorBtn.addEventListener('click', () => this.dom.fontColorPicker.click());
        this.dom.fontColorPicker.addEventListener('input', (e) => this.applyColor('foreColor', e.target.value));
        // Show/hide the dropdown when the main highlight button is clicked
        this.dom.highlightColorBtn.addEventListener('click', (e) => {
           
            e.preventDefault();
            e.stopPropagation();

            // Store the current selection before showing dropdown
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
                this.storedSelection = {
                    range: selection.getRangeAt(0).cloneRange(),
                    text: selection.toString()
                };
              
            } else {
                this.storedSelection = null;
            
            }

            this.dom.highlightOptions.classList.toggle('hidden');
           
        });

       // Handle clicks on the color options within the dropdown
        this.dom.highlightOptions.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const colorOption = e.target.closest('[data-color]');
            
            if (colorOption) {
                const color = colorOption.dataset.color;
                
                // Get fresh selection instead of using stored one
                const selection = window.getSelection();
                
                if (selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
                    // Use the current selection, not the stored one
                    this.applyColor('hiliteColor', color);
                } else if (this.storedSelection && this.storedSelection.text) {
                    // Fallback: try to find and select the exact text that was originally selected
                    this._selectTextInEditor(this.storedSelection.text);
                    if (window.getSelection().rangeCount > 0) {
                        this.applyColor('hiliteColor', color);
                    }
                }
                
                this.dom.highlightOptions.classList.add('hidden');
                this.storedSelection = null;
            } else if (!colorOption) {
                this.dom.highlightOptions.classList.add('hidden');
            }
        });

        // Updated Global listener
        document.addEventListener('click', (e) => {
            // Close sidebar if click is outside
            if (!this.dom.sidebar.contains(e.target) && !this.dom.toggleSidebarBtn.contains(e.target)) {
                this.dom.sidebar.classList.remove('open');
            }

            if (!this.dom.highlightColorBtn.contains(e.target) && !this.dom.highlightOptions.contains(e.target)) {
                // Check if the dropdown is currently visible before acting
                if (!this.dom.highlightOptions.classList.contains('hidden')) {
                    this.dom.highlightOptions.classList.add('hidden');
                    // CRITICAL FIX: Clear the stale selection to prevent the bug
                    this.storedSelection = null;
                }
            }
        });
        // Confirmation modal listeners
        this.dom.cancelDeleteBtn.addEventListener('click', () => {
            this.hideConfirmationModal();
        });

        this.dom.confirmDeleteBtn.addEventListener('click', () => {
            if (this.noteToDelete) {
                // Check if "Don't ask again" is checked
                if (this.dom.doNotAskAgain.checked) {
                    // Save the preference to never ask again
                    this.settings.confirmDelete = false;
                    this.saveData();
                }
                this.performDelete(this.noteToDelete);
            }
            this.hideConfirmationModal();
        });
    }
    
    

    /**
     * NATIVELY sanitizes HTML content to prevent XSS attacks.
     * This custom function works by parsing the HTML and removing any tags or
     * attributes that are not on an explicit "safe list".
     *
     *
     *
     * @param {string} dirtyHTML - The potentially unsafe HTML string from a note.
     * @returns {string} The sanitized HTML string.
     */
    _sanitizeHTML(dirtyHTML) {
        // A list of tags that your rich text editor is allowed to create.
        // sidepanel.js --> _sanitizeHTML()

        const allowedTags = ['p', 'b', 'i', 'u', 'ul', 'li', 'span', 'div', 'br', 'a'];

        // A list of attributes that are considered safe for the allowed tags.
        // We especially need 'style' for colors/highlights and 'href' for links.
        const allowedAttrs = ['style', 'href'];

        const parser = new DOMParser();
        const doc = parser.parseFromString(dirtyHTML, 'text/html');

        const walk = (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // 1. Remove the node if its tag is not in the allowed list
                if (!allowedTags.includes(node.tagName.toLowerCase())) {
                    node.parentNode.removeChild(node);
                    return;
                }

                // 2. Remove any attributes that are not on the allowed list or are dangerous
                const attributes = Array.from(node.attributes);
                attributes.forEach(attr => {
                    const attrName = attr.name.toLowerCase();
                    // Remove if not in the safe list OR if it's a dangerous 'on...' event handler
                    if (!allowedAttrs.includes(attrName) || attrName.startsWith('on')) {
                        node.removeAttribute(attr.name);
                    }
                    // Also remove any links that try to execute javascript
                    if (attrName === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:')) {
                        node.removeAttribute(attr.name);
                    }
                });
            }

            // 3. Recursively walk through the node's children
            // We use a static copy of the children array because the live list changes when we remove nodes.
            const children = Array.from(node.childNodes);
            children.forEach(walk);
        };

        // Start the process on the body of the parsed document
        walk(doc.body);

        return doc.body.innerHTML;
    }

    /**
     * Sanitizes a string to be used as plain text content, preventing HTML injection
     * in places like titles. It escapes HTML characters.
     * @param {string} text - The potentially unsafe text.
     * @returns {string} The safe, escaped text.
     */
    _sanitizeText(text) {
        const temp = document.createElement('div');
        temp.textContent = text;
        return temp.innerHTML;
    }
    
    /**
     * Handles updates to the current note's properties, triggers autosave, and re-renders lists if needed.
     * @param {object} updates - An object containing note properties to update.
     */
    _handleNoteUpdate(updates) {
        if (!this.currentNote) return;

        Object.assign(this.currentNote, updates);
        this.currentNote.lastModified = new Date().toISOString();

        if ('content' in updates) {
            this.updateWordCount();
        }
        if ('title' in updates) {
            this.renderNotesList(); // Re-render to show new title in sidebar
        }

        this.autoSave();

        // Update folder list if folder was changed
        if ('folder' in updates) {
            this.renderFolderList();
            this.updateFolderSelect();
        }

        // Re-render tags if tags were updated
        if ('tags' in updates) {
            this.renderTags();
        }
    }

    /**
     * Loads notes and settings from chrome.storage.local.
     */
    async loadData() {
        try {
            const result = await chrome.storage.local.get(['notes', 'settings']);

            // Validate notes data structure
            if (result.notes && Array.isArray(result.notes)) {
                this.notes = result.notes;
            } else {
                console.warn('Invalid notes data, initializing empty array');
                this.notes = [];
            }

            // Validate and merge settings
            if (result.settings && typeof result.settings === 'object') {
                this.settings = {
                    ...this.settings,
                    ...result.settings
                };

                // Validate all settings
                this._validateSettings();
            } else {
                console.warn('Invalid settings data, using defaults');
            }

        } catch (error) {
            console.error('Error loading data:', error);
            this._showErrorNotification('Failed to load notes');
            this.notes = [];
        }
    }

    /**
     * Validates all settings and applies defaults if invalid
     */
    _validateSettings() {
        // Validate fontSize
        const fontSize = parseInt(this.settings.fontSize, 10);
        if (isNaN(fontSize) || fontSize < 8 || fontSize > 72) {
            console.warn('Invalid fontSize, resetting to default');
            this.settings.fontSize = '14';
        }

        // Validate other boolean settings
        if (typeof this.settings.autoSave !== 'boolean') {
            this.settings.autoSave = true;
        }
        if (typeof this.settings.confirmDelete !== 'boolean') {
            this.settings.confirmDelete = true;
        }
    }
     
    /**
     * Attempts to select specific text in the editor
     * @param {string} textToFind - The text to find and select
     */
    _selectTextInEditor(textToFind) {
        if (!textToFind || textToFind.trim() === '') return false;
        
        const editorText = this.dom.editor.textContent;
        const index = editorText.indexOf(textToFind);
        
        if (index !== -1) {
            const selection = window.getSelection();
            const range = document.createRange();
            
            // Find the text node containing our text
            const walker = document.createTreeWalker(
                this.dom.editor,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let currentIndex = 0;
            let textNode;
            
            while (textNode = walker.nextNode()) {
                const nodeLength = textNode.textContent.length;
                if (currentIndex + nodeLength > index) {
                    // Found the node containing our text
                    const startOffset = index - currentIndex;
                    const endOffset = startOffset + textToFind.length;
                    
                    try {
                        range.setStart(textNode, startOffset);
                        range.setEnd(textNode, Math.min(endOffset, nodeLength));
                        
                        selection.removeAllRanges();
                        selection.addRange(range);
                        return true;
                    } catch (error) {
                        console.warn('Could not select text:', error);
                        return false;
                    }
                }
                currentIndex += nodeLength;
            }
        }
        
        return false;
    }
    
    /**
     * Removes highlight from selected text (simpler version)
     */
    _removeHighlight() {
        this.dom.editor.focus();
        
        // Remove background color
        document.execCommand('hiliteColor', false, 'transparent');
        
        // Alternative: try with removeFormat for more thorough cleanup
        // document.execCommand('removeFormat', false, null);
        
        this._handleNoteUpdate({ content: this.dom.editor.innerHTML });
    }

    /**
     * Saves notes and settings to chrome.storage.local.
     */
    async saveData() {
        try {
            // Validate data before saving
            if (!Array.isArray(this.notes)) {
                throw new Error('Notes is not an array');
            }
            if (typeof this.settings !== 'object') {
                throw new Error('Settings is not an object');
            }

            await chrome.storage.local.set({
                notes: this.notes,
                settings: this.settings
            });
            this.dom.lastSaved.textContent = 'Saved ' + new Date().toLocaleTimeString();
        } catch (error) {
            console.error('Error saving data:', error);
            this.dom.lastSaved.textContent = 'Save failed!';
            this._showErrorNotification('Failed to save notes');

            // Attempt to recover by saving to a backup key
            try {
                await chrome.storage.local.set({
                    notes_backup: this.notes,
                    settings_backup: this.settings
                });
            } catch (backupError) {
                console.error('Backup save also failed:', backupError);
            }
        }
    }

    /**
     * Shows an error notification to the user
     */
    _showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    /**
     * Triggers saveData after a delay if auto-save is enabled.
     */
    autoSave() {
        if (!this.settings.autoSave) return;
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveData(), 2000);
    }

    /**
     * Creates a new note object, adds it to the list, and loads it.
     */
    createNewNote() {
        const note = {
            id: Date.now().toString(),
            title: 'Untitled Note',
            content: '',
            folder: 'personal',
            tags: [],
            favorite: false,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        this.notes.unshift(note);
        this.renderNotesList();
        this.loadNote(note.id);
        this.saveData();

        // Update folder list
        this.renderFolderList();
        this.updateFolderSelect();

        setTimeout(() => {
            this.dom.noteTitle.focus();
            this.dom.noteTitle.select();
        }, 100);
    }

    /**
     * Adds a tag to the current note.
     */
    addTag() {
        if (!this.currentNote) return;

        const tagInput = this.dom.tagInput;
        const tag = tagInput.value.trim();

        if (tag && !this.currentNote.tags.includes(tag)) {
            this.currentNote.tags.push(tag);
            this._handleNoteUpdate({ tags: this.currentNote.tags });
            this.renderTags();
            tagInput.value = '';
        }
    }

    /**
     * Removes a tag from the current note.
     * @param {string} tag - The tag to remove.
     */
    removeTag(tag) {
        if (!this.currentNote) return;

        const index = this.currentNote.tags.indexOf(tag);
        if (index !== -1) {
            this.currentNote.tags.splice(index, 1);
            this._handleNoteUpdate({ tags: this.currentNote.tags });
            this.renderTags();
        }
    }

    /**
     * Renders the tags for the current note.
     */
    renderTags() {
        if (!this.currentNote) return;

        const tagsList = this.dom.tagsList;
        tagsList.innerHTML = '';

        this.currentNote.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag px-2 py-1 rounded text-xs';
            tagElement.textContent = tag;
            tagElement.dataset.tag = tag;

            // Add click event to remove tag
            tagElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTag(tag);
            });

            tagsList.appendChild(tagElement);
        });
    }

    /**
     * Adds a new folder.
     */
    addFolder() {
        const folderName = prompt('Enter folder name:');
        if (folderName && folderName.trim() !== '') {
            // Create a new note in the folder to ensure the folder exists
            const note = {
                id: Date.now().toString() + '-folder',
                title: 'New Note',
                content: '',
                folder: folderName.trim(),
                tags: [],
                favorite: false,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };

            this.notes.unshift(note);
            this.renderFolderList();
            this.renderNotesList();
            this.loadNote(note.id);
            this.saveData();
            this.updateFolderSelect();
        }
    }

    /**
     * Shows the context menu for folder options.
     * @param {Event} e - The context menu event.
     * @param {string} folderName - The name of the folder.
     */
    showFolderContextMenu(e, folderName) {
        // Set the folder name as a data attribute for later use
        this.dom.folderContextMenu.dataset.folder = folderName;

        // Position the context menu
        this.dom.folderContextMenu.style.left = `${e.pageX}px`;
        this.dom.folderContextMenu.style.top = `${e.pageY}px`;

        // Show the context menu
        this.dom.folderContextMenu.classList.remove('hidden');

        // Add event listener to hide the context menu when clicking elsewhere
        const hideContextMenu = (event) => {
            if (!this.dom.folderContextMenu.contains(event.target)) {
                this.dom.folderContextMenu.classList.add('hidden');
                document.removeEventListener('click', hideContextMenu);
            }
        };

        // Add event listener to handle context menu item clicks
        const handleContextMenuClick = (event) => {
            const menuItem = event.target.closest('.context-menu-item');
            if (menuItem) {
                const action = menuItem.dataset.action;
                if (action === 'rename') {
                    this.renameFolder(folderName);
                }
                this.dom.folderContextMenu.classList.add('hidden');
                document.removeEventListener('click', handleContextMenuClick);
            }
        };

        // Remove any existing listeners to prevent duplicates
        document.removeEventListener('click', hideContextMenu);
        document.removeEventListener('click', handleContextMenuClick);

        // Add the new listeners
        document.addEventListener('click', hideContextMenu);
        this.dom.folderContextMenu.addEventListener('click', handleContextMenuClick);
    }
    /**
     * Renames a folder and updates all notes in that folder.
     * @param {string} oldFolderName - The current name of the folder to rename.
     */
    renameFolder(oldFolderName) {
        const newFolderName = prompt('Enter new folder name:', oldFolderName);
        if (!newFolderName || newFolderName.trim() === '' || newFolderName === oldFolderName) {
            return; // Cancelled or no change
        }

        const trimmedName = newFolderName.trim();

        // Update all notes in this folder
        this.notes.forEach(note => {
            if (note.folder === oldFolderName) {
                note.folder = trimmedName;
            }
        });

        // Re-render the folder list and notes list
        this.renderFolderList();
        this.renderNotesList();
        this.updateFolderSelect();

        // Save the changes
        this.saveData();
    }

    /**
     * Loads a specific note into the editor view.
     * @param {string} noteId - The ID of the note to load.
     */
    loadNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) {
            console.warn(`Note with ID ${noteId} not found.`);
            return;
        }

        this.currentNote = note;
        this.dom.noteTitle.value = note.title || '';
        this.dom.editor.innerHTML = note.content || '';
        this.dom.folderSelect.value = note.folder || 'personal';

        const starIcon = this.dom.favoriteBtn.querySelector('svg');
        starIcon.style.fill = note.favorite ? 'currentColor' : 'none';

        this.updateWordCount();
        this.applySettings(); // Re-apply font settings for the loaded note

        // Highlight the selected note in the sidebar
        document.querySelectorAll('.note-card').forEach(card => {
            card.classList.toggle('active', card.dataset.noteId === noteId);
        });

        // Update folder select dropdown
        this.updateFolderSelect();

        // Render tags
        this.renderTags();

        // Update toolbar button states
        setTimeout(() => this.updateToolbarButtonStates(), 0);

        // Ensure editor view is shown
        this.showEditorView();
    }

    
    /**
     * Renders the list of notes in the sidebar.
     * @param {Array<object>} [notesToRender=this.notes] - An optional array of notes to render.
     */
    renderNotesList(notesToRender = this.notes) {
        this.dom.notesList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        // Fix: Ensure we're working with a valid array
        const validNotes = Array.isArray(notesToRender) ? notesToRender : this.notes;
        
        const notesToShow = (validNotes === this.notes)
            ? validNotes.slice(0, 3)
            : validNotes;

        notesToShow.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-card p-3 mb-2 rounded-lg cursor-pointer';
            noteElement.dataset.noteId = note.id;

            if (this.currentNote && this.currentNote.id === note.id) {
                noteElement.classList.add('active');
            }

            // Fix: Sanitize title and preview to prevent HTML injection issues
            const title = this._sanitizeText(note.title || 'Untitled Note');
            const preview = this._sanitizeText(this._getTextContent(note.content).substring(0, 60)) + (note.content.length > 60 ? '...' : '');
            
            const d = new Date(note.lastModified);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const year = d.getFullYear();
            const date = `${day}-${month}-${year}`;

            noteElement.innerHTML = `
                <div class="flex items-start justify-between mb-1">
                    <h4 class="font-medium text-sm truncate flex-1">${title}</h4>
                    <div class="flex items-center space-x-1 ml-2 flex-shrink-0">
                        ${note.favorite ? '<svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>' : ''}
                        <button class="delete-btn p-1 hover:bg-red-100 rounded" data-note-id="${note.id}">
                            <svg class="w-3 h-3 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <p class="text-xs mb-1 text-secondary">${preview}</p>
                <div class="flex items-center justify-between">
                    <span class="tag">${this._sanitizeText(note.folder)}</span>
                    <span class="text-xs text-secondary">${date}</span>
                </div>
            `;
            fragment.appendChild(noteElement);
        });

        this.dom.notesList.appendChild(fragment);
        
        // Fix: Add animation call if the method exists
        if (typeof this._animateNoteCards === 'function') {
            this._animateNoteCards();
        }
    }

    /**
     * Filters and displays notes based on a search query.
     * @param {string} query - The search term.
     */
    searchNotes(query) {
        const lowerCaseQuery = query.toLowerCase();
        const filtered = this.notes.filter(note =>
            note.title.toLowerCase().includes(lowerCaseQuery) ||
            note.content.toLowerCase().includes(lowerCaseQuery)
        );
        this.renderNotesList(filtered);
        this.updateFolderSelect();
    }

    /**
     * Filters notes by the selected folder.
     * @param {string} folderName - The name of the folder to filter by.
     */
    selectFolder(folderName) {
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.toggle('active', item.dataset.folder === folderName);
        });

        const filtered = folderName === 'all'
            ? this.notes
            : this.notes.filter(note => note.folder === folderName);

        this.renderNotesList(filtered);
        this.updateFolderSelect();
    }

    /**
     * Shows the folder notes view with notes from the specified folder.
     * @param {string} folderName - The name of the folder to display.
     */
    showFolderNotes(folderName) {
        if (folderName === 'all') {
            // For "All Notes", just show all notes in the sidebar
            this.selectFolder(folderName);
            return;
        }

        // --- ADD THIS BLOCK TO FIX HIGHLIGHTING ---
        // Loop through all folder items and set the active state correctly.
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.toggle('active', item.dataset.folder === folderName);
        });
        // -----------------------------------------

        // Set the folder name in the header
        this.dom.folderNameHeader.textContent = folderName;

        // Store the current folder for search functionality
        this.currentFolder = folderName;

        // Show folder notes view and hide editor view
        this.dom.editorView.classList.add('hidden');
        this.dom.folderNotesView.classList.remove('hidden');

        // Render notes for this folder
        this.renderFolderNotesList();
    }

    /**
     * Shows the editor view and hides the folder notes view.
     */
    showEditorView() {
        this.dom.folderNotesView.classList.add('hidden');
        this.dom.editorView.classList.remove('hidden');
    }

    /**
     * Renders the list of notes for the current folder in the folder view.
     * @param {Array<object>} [notesToRender] - An optional array of notes to render.
     */
    renderFolderNotesList(notesToRender) {
        // If no notes provided, filter notes by current folder
        const notes = notesToRender || this.notes.filter(note => note.folder === this.currentFolder);

        this.dom.folderNotesList.innerHTML = '';
        const fragment = document.createDocumentFragment();

        notes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-card p-4 rounded-lg cursor-pointer';
            noteElement.dataset.noteId = note.id;

            const title = note.title || 'Untitled Note';
            const preview = this._getTextContent(note.content).substring(0, 100) + (note.content.length > 100 ? '...' : '');
            const d = new Date(note.lastModified);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const year = d.getFullYear();
            const date = `${day}-${month}-${year}`;

            noteElement.innerHTML = `
                <h4 class="font-medium text-lg mb-2 truncate">${title}</h4>
                <p class="text-sm mb-3 text-secondary">${preview}</p>
                <div class="flex items-center justify-between">
                    <span class="text-xs text-secondary">${date}</span>
                    ${note.favorite ? '<svg class="w-4 h-4 text-yellow-400 inline" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>' : ''}
                </div>
            `;
            fragment.appendChild(noteElement);
        });

        this.dom.folderNotesList.appendChild(fragment);

    }

    /**
     * Searches notes within the current folder.
     * @param {string} query - The search term.
     */
    searchFolderNotes(query) {
        if (!this.currentFolder) return;

        const lowerCaseQuery = query.toLowerCase();
        const filtered = this.notes.filter(note =>
            note.folder === this.currentFolder &&
            (note.title.toLowerCase().includes(lowerCaseQuery) ||
                note.content.toLowerCase().includes(lowerCaseQuery))
        );

        this.renderFolderNotesList(filtered);
    }

    /**
     * Gets all unique folder names from notes.
     * @returns {Array<string>} Array of folder names.
     */
    getFolders() {
        const folders = new Set();
        this.notes.forEach(note => {
            if (note.folder) {
                folders.add(note.folder);
            }
        });
        return Array.from(folders).sort();
    }


    /**
     * Renders the folder list in the sidebar.
     */
    renderFolderList() {
        const folders = this.getFolders();
        const foldersList = this.dom.foldersList;

        // Clear existing folders except "All Notes"
        while (foldersList.children.length > 1) {
            foldersList.removeChild(foldersList.lastChild);
        }

        // Add folders
        folders.forEach(folder => {
            const folderElement = document.createElement('div');
            folderElement.className = 'folder-item';
            folderElement.dataset.folder = folder;
            folderElement.innerHTML = `
                <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
                ${folder}
            `;
            foldersList.appendChild(folderElement);
        });


        // Update folder select dropdown
        this.updateFolderSelect();
    }

    /**
     * Updates the folder select dropdown with current folders.
     */
    updateFolderSelect() {
        const folders = this.getFolders();
        const folderSelect = this.dom.folderSelect;

        // Clear existing options
        folderSelect.innerHTML = '';

        // Add folders as options
        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            option.textContent = folder;
            folderSelect.appendChild(option);
        });

        // Set selected value if there's a current note
        if (this.currentNote && this.currentNote.folder) {
            folderSelect.value = this.currentNote.folder;
        }
    }

    /**
 * Executes a rich text command on the editor, with special handling
 * to ensure the unordered list command works as a reliable toggle.
 * @param {string} command - The command to execute (e.g., 'bold').
 * @param {string|null} [value=null] - The value for commands that require one (e.g., 'foreColor').
 */
    execCommand(command, value = null) {
        this.dom.editor.focus();

        // Special handling for the list command to make it a reliable toggle.
        if (command === 'insertUnorderedList') {
            // Check if the current selection is already inside a list.
            const isAlreadyList = document.queryCommandState('insertUnorderedList');

            if (isAlreadyList) {
                // If it is a list, turn the list item back into a normal paragraph.
                // This is more reliable than expecting the command to toggle itself off.
                document.execCommand('formatBlock', false, 'p');
            } else {
                // If it's not a list, execute the command to create one.
                document.execCommand(command, false, value);
            }
        } else {
            // For all other commands, execute them as usual.
            document.execCommand(command, false, value);
        }

        // Update note content and toolbar state after any command.
        this._handleNoteUpdate({ content: this.dom.editor.innerHTML });
        this.updateToolbarButtonStates();
    }

        /**
     * Handles the Backspace key in a list. If the cursor is at the very
     * beginning of a list item, it converts the item into a normal paragraph
     * by executing the 'outdent' command.
     * @param {KeyboardEvent} e The keyboard event object.
     */
    _handleBackspaceInList(e) {
        const selection = window.getSelection();
        // Exit if there is no cursor or if a range of text is selected
        if (!selection || !selection.isCollapsed || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);
        const container = range.startContainer;

        // We only want to act when the cursor is at the beginning of a block
        if (range.startOffset === 0) {
            const listItem = container.nodeType === Node.ELEMENT_NODE 
                ? container.closest('li') 
                : container.parentElement.closest('li');

            // If the cursor is within a list item (<li>)
            if (listItem) {
                // A reliable way to check if we're at the very start is to see if
                // there's any visible content before the cursor within this list item.
                const rangeBefore = document.createRange();
                rangeBefore.selectNodeContents(listItem);
                rangeBefore.setEnd(range.startContainer, range.startOffset);
                
                if (rangeBefore.toString().trim() === '') {
                    // If there's no text before the cursor, we're at the start.
                    // Prevent the browser's default backspace.
                    e.preventDefault();

                    // Use the 'outdent' command, which is the correct browser-native
                    // instruction for this exact situation.
                    document.execCommand('outdent');

                    // Save the updated content.
                    this._handleNoteUpdate({ content: this.dom.editor.innerHTML });
                }
            }
        }
    }
    applyColor(command, value) {
        // 1. Ensure the editor has focus before executing commands.
        this.dom.editor.focus();
    
        // Store the original selection
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const isCollapsed = range.collapsed;
    
        // ADD THIS SECTION: Handle unhighlight (remove highlight)
        if (command === 'hiliteColor' && value === 'none') {
            this._removeHighlight();
            return;
        }
    
        // 2. Apply the desired color to the currently selected text.
        document.execCommand(command, false, value);
    
        // 3. Enhanced logic for "breaking out" of the highlight style.
        if (command === 'hiliteColor' && !isCollapsed) {
            // Wait a moment for the command to complete
            setTimeout(() => {
                const newSelection = window.getSelection();
                if (!newSelection || newSelection.rangeCount === 0) return;
    
                const newRange = newSelection.getRangeAt(0);
                
                // Move cursor to the end of the highlighted text
                newRange.collapse(false);
                
                // Create a clean text node to break the formatting
                const breakNode = document.createTextNode('\u200B'); // Zero-width space
                
                try {
                    // Insert the break node
                    newRange.insertNode(breakNode);
                    
                    // Position cursor after the break node
                    newRange.setStartAfter(breakNode);
                    newRange.setEndAfter(breakNode);
                    
                    // Apply the new selection
                    newSelection.removeAllRanges();
                    newSelection.addRange(newRange);
                    
                    // Clean up: remove the zero-width space after a short delay
                    setTimeout(() => {
                        if (breakNode.parentNode) {
                            // Replace zero-width space with a regular space if needed
                            const nextSibling = breakNode.nextSibling;
                            const prevSibling = breakNode.previousSibling;
                            
                            // Only add space if there isn't already whitespace
                            if ((!nextSibling || nextSibling.nodeType !== Node.TEXT_NODE || !nextSibling.textContent.startsWith(' ')) &&
                                (!prevSibling || prevSibling.nodeType !== Node.TEXT_NODE || !prevSibling.textContent.endsWith(' '))) {
                                const spaceNode = document.createTextNode(' ');
                                breakNode.parentNode.replaceChild(spaceNode, breakNode);
                                
                                // Position cursor after the space
                                const finalRange = document.createRange();
                                finalRange.setStartAfter(spaceNode);
                                finalRange.setEndAfter(spaceNode);
                                newSelection.removeAllRanges();
                                newSelection.addRange(finalRange);
                            } else {
                                breakNode.parentNode.removeChild(breakNode);
                            }
                        }
                    }, 100);
                    
                } catch (error) {
                    console.warn('Could not insert break node:', error);
                    // Fallback: just collapse to end
                    newRange.collapse(false);
                    newSelection.removeAllRanges();
                    newSelection.addRange(newRange);
                }
            }, 10);
        }
        
        // 4. Save the updated note content.
        this._handleNoteUpdate({ content: this.dom.editor.innerHTML });
    }
    /**
     * Toggles the 'favorite' status of the current note.
     */
    toggleFavorite() {
        if (!this.currentNote) return;

        this.currentNote.favorite = !this.currentNote.favorite;
        const starIcon = this.dom.favoriteBtn.querySelector('svg');
        starIcon.style.fill = this.currentNote.favorite ? 'currentColor' : 'none';

        this.renderNotesList();
        this.autoSave();
        this._pulseAnimation(this.dom.favoriteBtn);
    }

    /**
     * Converts URLs in text to clickable links while preserving existing links
     * @param {string} html - The HTML content to process
     * @returns {string} The HTML content with URLs converted to links
     */
    convertUrlsToLinks(html) {
        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Improved URL regex that matches various URL patterns including:
        // - http://example.com, https://example.com
        // - www.example.com
        // - example.com (this will be prefixed with http://)
        const urlRegex = /(https?:\/\/(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[^\s]{2,}|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[^\s]{2,})/gi;

        // Function to process text nodes
        const processNode = (node) => {
            // Skip anchor elements and their children
            if (node.tagName === 'A') {
                return;
            }

            // Process child nodes
            if (node.childNodes) {
                for (let i = 0; i < node.childNodes.length; i++) {
                    const childNode = node.childNodes[i];
                    // Process text nodes
                    if (childNode.nodeType === Node.TEXT_NODE) {
                        const text = childNode.textContent;
                        // Check if the text contains URLs
                        if (urlRegex.test(text)) {
                            // Reset regex index
                            urlRegex.lastIndex = 0;
                            // Create a fragment to replace the text node
                            const fragment = document.createDocumentFragment();
                            // Split the text by URLs
                            const parts = text.split(urlRegex);
                            // Process each part
                            parts.forEach((part, index) => {
                                if (index % 2 === 0) {
                                    // Regular text part
                                    if (part) {
                                        fragment.appendChild(document.createTextNode(part));
                                    }
                                } else {
                                    // URL part - create anchor element
                                    const link = document.createElement('a');
                                    // Add protocol if missing
                                    const href = part.startsWith('http') ? part :
                                        part.startsWith('www.') ? 'http://' + part :
                                            'http://' + part;
                                    link.href = href;
                                    link.target = '_blank';
                                    link.textContent = part;
                                    fragment.appendChild(link);
                                }
                            });
                            // Replace the text node with the fragment
                            childNode.parentNode.replaceChild(fragment, childNode);
                        }
                    } else {
                        // Process other nodes recursively
                        processNode(childNode);
                    }
                }
            }
        };

        // Process the temporary div
        processNode(tempDiv);

        // Return the modified HTML
        return tempDiv.innerHTML;
    }

    /**
     * Updates the word count display based on the editor's content.
     */
    updateWordCount() {
        const text = this._getTextContent(this.dom.editor.innerHTML);
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        this.dom.wordCount.textContent = `${wordCount} word${wordCount !== 1 ? 's' : ''}`;
    }

    _handleEnterKey(e) {
        // Check if we're currently in a highlighted span
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        
        // Find if we're inside a span with background color (highlight)
        let parentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        const highlightSpan = parentElement.closest('span[style*="background-color"], span[style*="backgroundColor"]');
        
        if (highlightSpan) {
            // We're inside a highlighted span, so we need to break out of it
            e.preventDefault();
            
            // Create a new paragraph or br element
            const newLine = document.createElement('div');
            newLine.innerHTML = '<br>'; // Empty div with br for proper line break
            
            // Get the current cursor position
            const currentRange = selection.getRangeAt(0);
            
            // Insert the new line
            currentRange.collapse(false);
            currentRange.insertNode(newLine);
            
            // Position cursor in the new line
            const newRange = document.createRange();
            newRange.setStart(newLine, 0);
            newRange.setEnd(newLine, 0);
            
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            // Update the content
            this._handleNoteUpdate({ content: this.dom.editor.innerHTML });
        }
    }
    

    /**
     * Strips HTML tags from a string to get plain text.
     * @param {string} html - The HTML string.
     * @returns {string} The plain text content.
     */
    _getTextContent(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    /**
 * Applies the current settings to the UI (theme and fonts).
 */
    applySettings() {
        const fontSize = parseInt(this.settings.fontSize, 10) || 14;
        // Set the value of our new dropdown to the saved setting
        this.dom.fontSizeSelect.value = fontSize; 
        // Also apply the base font size to the editor itself
        this.dom.editor.style.fontSize = `${fontSize}px`; 
    }
    /**
 * Checks the formatting state of the current selection and updates all
 * relevant toolbar buttons and controls to reflect it. This includes
 * toggling active states and setting the font size dropdown.
 */
    updateToolbarButtonStates() {
        // Get the formatting buttons and the font size select from the DOM
        const boldBtn = this.dom.toolbar.querySelector('[data-command="bold"]');
        const italicBtn = this.dom.toolbar.querySelector('[data-command="italic"]');
        const underlineBtn = this.dom.toolbar.querySelector('[data-command="underline"]');

        // Early exit if any essential toolbar element is missing
        if (!boldBtn || !italicBtn || !underlineBtn || !this.dom.fontSizeSelect) {
            return;
        }

        // --- 1. Handle formatting buttons (Bold, Italic, Underline) ---
        // The `toggle` method's second argument sets the class if true, and removes it if false.
        // This is a clean way to sync the button state with the editor's state.
        boldBtn.classList.toggle('active', document.queryCommandState('bold'));
        italicBtn.classList.toggle('active', document.queryCommandState('italic'));
        underlineBtn.classList.toggle('active', document.queryCommandState('underline'));

        // --- 2. Handle Font Size Dropdown ---
        const selection = window.getSelection();
        
        // Proceed only if there is an active selection/cursor inside the editor
        if (selection && selection.rangeCount > 0 && this.dom.editor.contains(selection.anchorNode)) {
            let parentElement = selection.getRangeAt(0).commonAncestorContainer;

            // If the selection starts inside a text node, we need to check its parent element for styling.
            if (parentElement.nodeType === Node.TEXT_NODE) {
                parentElement = parentElement.parentElement;
            }

            // Traverse up from the selection to find the closest custom font-size span we created
            const sizeSpan = parentElement.closest('span[data-font-size-span]');

            if (sizeSpan && sizeSpan.style.fontSize) {
                // If a custom styled span is found, parse its font size...
                const currentSize = parseInt(sizeSpan.style.fontSize, 10);
                // ...and set the dropdown's value to match.
                this.dom.fontSizeSelect.value = currentSize;
            } else {
                // Check if we're inside any element with computed font size
                const computedStyle = window.getComputedStyle(parentElement);
                const computedFontSize = parseInt(computedStyle.fontSize, 10);
                
                // Use computed font size if available, otherwise use global setting
                this.dom.fontSizeSelect.value = computedFontSize || parseInt(this.settings.fontSize, 10);
            }
        }
    }

    _applyFontSizeToSelection(size) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.getRangeAt(0).collapsed) {
            return;
        }
    
        const range = selection.getRangeAt(0);
        
        // Check if selection is entirely within an existing font-size span
        let startContainer = range.startContainer;
        let endContainer = range.endContainer;
        
        if (startContainer.nodeType === Node.TEXT_NODE) {
            startContainer = startContainer.parentElement;
        }
        if (endContainer.nodeType === Node.TEXT_NODE) {
            endContainer = endContainer.parentElement;
        }
        
        const startSpan = startContainer.closest('span[data-font-size-span]');
        const endSpan = endContainer.closest('span[data-font-size-span]');
        
        // If selection is entirely within one existing span, just modify that span
        if (startSpan && startSpan === endSpan && startSpan.contains(range.commonAncestorContainer)) {
            startSpan.style.fontSize = size + 'px';
            
            // Re-select the original selection
            selection.removeAllRanges();
            selection.addRange(range);
            
            this._handleNoteUpdate({ content: this.dom.editor.innerHTML });
            this.dom.editor.focus();
            return;
        }
        
        // For new selections or complex selections, create new span
        try {
            // Extract the selected content
            const selectedContent = range.extractContents();
            
            // Create a new span for the font size
            const newSpan = document.createElement('span');
            newSpan.style.fontSize = size + 'px';
            newSpan.dataset.fontSizeSpan = 'true';
            
            // Put the selected content inside the new span
            newSpan.appendChild(selectedContent);
            
            // Insert the span back into the document
            range.insertNode(newSpan);
            
            // Re-select the content inside the new span
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(newSpan);
            selection.addRange(newRange);
            
        } catch (error) {
            console.error("Error applying font size:", error);
        }
    
        this._handleNoteUpdate({ content: this.dom.editor.innerHTML });
        this.dom.editor.focus();
    }

    /**
     * Sets the global default font size for the editor.
     * @param {string} size - The new font size in pixels.
     */
    _setGlobalFontSize(size) {
        const newSize = parseInt(size, 10);

        // Validate the new size.
        if (isNaN(newSize) || newSize < 8 || newSize > 72) {
            // If invalid, reset the display to the last known good setting.
            this.dom.fontSizeDisplay.value = this.settings.fontSize;
            return;
        }

        // Update settings, apply them to the UI, and save the data.
        this.settings.fontSize = newSize.toString();
        this.dom.editor.style.fontSize = `${newSize}px`;
        this.applySettings();
        this.saveData();
    }


    deleteNote(noteId) {
        this.showConfirmationModal(noteId);
    }

   
/**
 * Shows the confirmation modal for note deletion.
 * @param {string} noteId - The ID of the note to delete.
 */
    showConfirmationModal(noteId) {
        
        // Check if user has selected "Don't ask again" and confirmation is disabled
        if (!this.settings.confirmDelete) {
            // Directly delete the note without showing confirmation
            this.performDelete(noteId);
            return;
        }

        this.noteToDelete = noteId;
        this.dom.confirmationModal.classList.remove('hidden');
    }

    /**
     * Hides the confirmation modal.
     */
    hideConfirmationModal() {
        this.dom.confirmationModal.classList.add('hidden');
        this.dom.doNotAskAgain.checked = false;
    }

        /**
     * Fixed performDelete method with correct method names
     */
    performDelete(noteId) {
        const noteIndex = this.notes.findIndex(note => note.id === noteId);
        if (noteIndex === -1) return;

        const wasCurrentNote = this.currentNote && this.currentNote.id === noteId;

        // Remove the note from the array
        this.notes.splice(noteIndex, 1);

        if (wasCurrentNote) {
            this.currentNote = null;
            // Decide which note to load from the modified array
            if (this.notes.length > 0) {
                // Load the first available note
                this.loadNote(this.notes[0].id);
            } else {
                // Create a new one if no notes are left
                this.createNewNote();
            }
        }

        // Fix: Use correct method names
        this.saveData();        // ✅ Correct method name
        this.renderNotesList(); // ✅ Correct method name
        
        // Also update folder list in case folder becomes empty
        this.renderFolderList();
        this.updateFolderSelect();
    }
    /**
     * Debounce function to limit the rate at which a function is called.
     * @param {Function} func - The function to debounce.
     * @param {number} delay - The delay in milliseconds.
     * @returns {Function} The debounced function.
     */
    debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }


};
new NoteNest();