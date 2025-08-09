/**
 * @file sidepanel.js
 * @description Main logic for the QuickNotes Chrome Extension sidepanel.
 * @version 2.0.0
 * @date 2025-08-09
 */

class QuickNotesApp {
    /**
     * Initializes the application, sets up properties, and caches DOM elements.
     */
    constructor() {
        this.notes = [];
        this.currentNote = null;
        this.settings = {
            fontSize: '14',
            fontFamily: 'Inter',
            autoSave: true
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
        this._setupAnimations();

        if (this.notes.length === 0) {
            this.createNewNote();
        } else {
            // Load the most recently modified note first.
            const sortedNotes = [...this.notes].sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
            this.notes = sortedNotes;
            this.loadNote(this.notes[0].id);
        }
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
        this.dom.foldersList = document.getElementById('foldersList');
        this.dom.notesList = document.getElementById('notesList');

        // Editor
        this.dom.editorContainer = document.getElementById('editorContainer');
        this.dom.noteTitle = document.getElementById('noteTitle');
        this.dom.editor = document.getElementById('editor');
        this.dom.wordCount = document.getElementById('wordCount');
        this.dom.lastSaved = document.getElementById('lastSaved');
        this.dom.folderSelect = document.getElementById('folderSelect');
        this.dom.favoriteBtn = document.getElementById('favoriteBtn');

        // Toolbar
        this.dom.toolbar = document.getElementById('toolbar');
        this.dom.increaseFontBtn = document.getElementById('increaseFontBtn');
        this.dom.decreaseFontBtn = document.getElementById('decreaseFontBtn');
        this.dom.fontSizeDisplay = document.getElementById('fontSizeDisplay');
        this.dom.toolbarFontSelect = document.getElementById('toolbarFontSelect'); // NOTE: Assumes ID in HTML is corrected from 'fontSizeSelect'
        this.dom.fontColorBtn = document.getElementById('fontColorBtn');
        this.dom.fontColorPicker = document.getElementById('fontColorPicker');
        this.dom.highlightColorBtn = document.getElementById('highlightColorBtn');
        this.dom.highlightColorPicker = document.getElementById('highlightColorPicker');

       
    }

    /**
     * Sets up all event listeners for the application.
     */
    _setupEventListeners() {
        // Header listeners
        this.dom.toggleSidebarBtn.addEventListener('click', () => this.dom.sidebar.classList.toggle('open'));
        

        // Sidebar listeners
        this.dom.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.dom.searchInput.addEventListener('input', (e) => this.searchNotes(e.target.value));
        this.dom.foldersList.addEventListener('click', (e) => {
             const folderItem = e.target.closest('.folder-item');
             if(folderItem) this.selectFolder(folderItem.dataset.folder);
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
        this.dom.folderSelect.addEventListener('change', (e) => this._handleNoteUpdate({ folder: e.target.value }));
        this.dom.favoriteBtn.addEventListener('click', () => this.toggleFavorite());

        // Toolbar listeners
        this.dom.toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('[data-command], [data-heading]');
            if (!button) return;

            const command = button.dataset.command;
            const heading = button.dataset.heading;
            
            if (command) this.execCommand(command);
            if (heading) this.execCommand('formatBlock', `<${heading}>`);
            
            this._pulseAnimation(button);
        });
        
        // Toolbar Font Size Controls
        this.dom.increaseFontBtn.addEventListener('click', () => this._changeFontSize(1));
        this.dom.decreaseFontBtn.addEventListener('click', () => this._changeFontSize(-1));

        // Toolbar Color Pickers
        this.dom.fontColorBtn.addEventListener('click', () => this.dom.fontColorPicker.click());
        this.dom.fontColorPicker.addEventListener('input', (e) => this.execCommand('foreColor', e.target.value));
        this.dom.highlightColorBtn.addEventListener('click', () => this.dom.highlightColorPicker.click());
        this.dom.highlightColorPicker.addEventListener('input', (e) => this.execCommand('hiliteColor', e.target.value));

    
        // Global listeners
        document.addEventListener('keydown', (e) => this._handleKeyboardShortcuts(e));
        document.addEventListener('click', (e) => {
            if (!this.dom.sidebar.contains(e.target) && !this.dom.toggleSidebarBtn.contains(e.target)) {
                this.dom.sidebar.classList.remove('open');
            }
        });
    }

    /**
     * Handles keyboard shortcuts for common actions.
     * @param {KeyboardEvent} e The keyboard event object.
     */
    _handleKeyboardShortcuts(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

        if (ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'b': e.preventDefault(); this.execCommand('bold'); break;
                case 'i': e.preventDefault(); this.execCommand('italic'); break;
                case 'u': e.preventDefault(); this.execCommand('underline'); break;
                case 's': e.preventDefault(); this.saveData(); break;
            }
        }
        if (e.altKey) {
            switch (e.key.toLowerCase()) {
                case 'n': e.preventDefault(); this.createNewNote(); break;
                case 'f': e.preventDefault(); this.dom.searchInput.focus(); break;
            }
        }
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
    }
    
    /**
     * Changes the editor font size, saves it to settings, and applies it.
     * @param {number} delta - The amount to change the font size by (e.g., 1 or -1).
     */
    _changeFontSize(delta) {
        let newSize = parseInt(this.settings.fontSize, 10) + delta;
        if (newSize < 8) newSize = 8; // Set a minimum font size
        if (newSize > 72) newSize = 72; // Set a maximum font size

        this.settings.fontSize = newSize.toString();
        this.applySettings();
        this.autoSave();
    }

    /**
     * Loads notes and settings from chrome.storage.local.
     */
    async loadData() {
        try {
            const result = await chrome.storage.local.get(['notes', 'settings']);
            this.notes = result.notes || [];
            this.settings = { ...this.settings, ...result.settings };
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    /**
     * Saves notes and settings to chrome.storage.local.
     */
    async saveData() {
        try {
            await chrome.storage.local.set({
                notes: this.notes,
                settings: this.settings
            });
            this.dom.lastSaved.textContent = 'Saved ' + new Date().toLocaleTimeString();
        } catch (error) {
            console.error('Error saving data:', error);
            this.dom.lastSaved.textContent = 'Save failed!';
        }
    }

    /**
     * Triggers saveData after a delay if auto-save is enabled.
     */
    autoSave() {
        if (!this.settings.autoSave) return;
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveData(), 1500);
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

        setTimeout(() => {
            this.dom.noteTitle.focus();
            this.dom.noteTitle.select();
        }, 100);
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
    }

    /**
     * Deletes a note from the application.
     * @param {string} noteId - The ID of the note to delete.
     */
    deleteNote(noteId) {
        const noteIndex = this.notes.findIndex(n => n.id === noteId);
        if (noteIndex === -1) return;

        this.notes.splice(noteIndex, 1);
        
        if (this.currentNote && this.currentNote.id === noteId) {
            this.currentNote = null;
            if (this.notes.length > 0) {
                this.loadNote(this.notes[0].id);
            } else {
                this.createNewNote();
            }
        }

        this.renderNotesList();
        this.saveData();
    }
    
    /**
     * Renders the list of notes in the sidebar.
     * @param {Array<object>} [notesToRender=this.notes] - An optional array of notes to render.
     */
    renderNotesList(notesToRender = this.notes) {
        this.dom.notesList.innerHTML = '';
        const fragment = document.createDocumentFragment();

        notesToRender.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-card p-3 mb-2 rounded-lg cursor-pointer';
            noteElement.dataset.noteId = note.id;
            
            if (this.currentNote && this.currentNote.id === note.id) {
                noteElement.classList.add('active');
            }

            const title = note.title || 'Untitled Note';
            const preview = this._getTextContent(note.content).substring(0, 60) + (note.content.length > 60 ? '...' : '');
            const date = new Date(note.lastModified).toLocaleDateString();

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
                    <span class="tag">${note.folder}</span>
                    <span class="text-xs text-secondary">${date}</span>
                </div>
            `;
            fragment.appendChild(noteElement);
        });

        this.dom.notesList.appendChild(fragment);
        setTimeout(() => this._animateNoteCards(), 50); // Animate after render
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
    }
    
    /**
     * Executes a rich text command on the editor.
     * @param {string} command - The command to execute (e.g., 'bold').
     * @param {string|null} [value=null] - The value for commands that require one (e.g., 'foreColor').
     */
    execCommand(command, value = null) {
        document.execCommand(command, false, value);
        this.dom.editor.focus();
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
     * Updates the word count display based on the editor's content.
     */
    updateWordCount() {
        const text = this._getTextContent(this.dom.editor.innerHTML);
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        this.dom.wordCount.textContent = `${wordCount} word${wordCount !== 1 ? 's' : ''}`;
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
     * Displays and animates the settings modal.
     */
    showSettings() {
        this.dom.themeSelect.value = this.settings.theme;
        this.dom.fontSelect.value = this.settings.fontFamily;
        this.dom.fontSizeSelect.value = this.settings.fontSize;
        this.dom.autoSaveToggle.checked = this.settings.autoSave;
        this.dom.settingsModal.classList.remove('hidden');
        
        gsap.fromTo(this.dom.settingsModal.querySelector('div'),
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
        );
    }

    /**
     * Hides and animates the settings modal.
     */
    hideSettings() {
        gsap.to(this.dom.settingsModal.querySelector('div'), { 
            scale: 0.8, 
            opacity: 0, 
            duration: 0.2,
            onComplete: () => this.dom.settingsModal.classList.add('hidden')
        });
    }

    /**
     * Saves the settings from the modal, applies them, and closes the modal.
     */
    saveSettings() {
        this.settings.theme = this.dom.themeSelect.value;
        this.settings.fontFamily = this.dom.fontSelect.value;
        this.settings.fontSize = this.dom.fontSizeSelect.value;
        this.settings.autoSave = this.dom.autoSaveToggle.checked;

        this.applySettings();
        this.saveData();
        
        setTimeout(() => this.hideSettings(), 500);
    }
    
    /**
     * Applies the current settings to the UI (theme and fonts).
     */
    applySettings() {
        this.dom.editor.style.fontFamily = this.settings.fontFamily;
        this.dom.editor.style.fontSize = this.settings.fontSize + 'px';
        this.dom.fontSizeDisplay.textContent = this.settings.fontSize;
    }

    /**
     * Applies the selected theme (light/dark/auto) to the document.
     */
    applyTheme() {
        const html = document.documentElement;
        if (this.settings.theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            html.setAttribute('data-theme', this.settings.theme);
        }
    }
    
    // --- Animations ---

    /**
     * Sets up the initial animations for the application panel.
     */
    _setupAnimations() {
        gsap.fromTo(this.dom.app, 
            { x: '100%', opacity: 0 },
            { x: '0%', opacity: 1, duration: 0.6, ease: 'power4.out' }
        );
    }
    
    /**
     * Animates the note cards with a staggered effect.
     */
    _animateNoteCards() {
        gsap.fromTo('.note-card',
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.7)' }
        );
    }

    /**
     * Applies a brief pulse animation to an element.
     * @param {HTMLElement} element - The element to animate.
     */
    _pulseAnimation(element) {
        gsap.fromTo(element, 
            { scale: 1 }, 
            { scale: 1.1, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.inOut' }
        );
    }
}


// --- Global Initialization ---

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new QuickNotesApp();
});

