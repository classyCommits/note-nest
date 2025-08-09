// QuickNotes Chrome Extension - Content Script
// This script runs on all web pages and provides functionality to capture content and interact with the sidepanel

class QuickNotesContent {
    constructor() {
        this.selectedText = '';
        this.isEnabled = true;
        this.quickNoteButton = null;
        this.init();
    }

    init() {
        this.createQuickNoteButton();
        this.setupEventListeners();
        this.setupMessageListener();
    }

    // Create floating quick note button that appears on text selection
    createQuickNoteButton() {
        this.quickNoteButton = document.createElement('div');
        this.quickNoteButton.id = 'quicknotes-btn';
        this.quickNoteButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3v18M3 12h18"/>
            </svg>
        `;
        
        // Styling for the quick note button
        Object.assign(this.quickNoteButton.style, {
            position: 'fixed',
            top: '10px',
            right: '10px',
            width: '40px',
            height: '40px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '50%',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: '10000',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            border: 'none'
        });

        // Add hover effects
        this.quickNoteButton.addEventListener('mouseenter', () => {
            this.quickNoteButton.style.transform = 'scale(1.1)';
            this.quickNoteButton.style.backgroundColor = '#2563eb';
        });

        this.quickNoteButton.addEventListener('mouseleave', () => {
            this.quickNoteButton.style.transform = 'scale(1)';
            this.quickNoteButton.style.backgroundColor = '#3b82f6';
        });

        document.body.appendChild(this.quickNoteButton);
    }

    // Setup event listeners for text selection and button clicks
    setupEventListeners() {
        // Handle text selection
        document.addEventListener('mouseup', (e) => {
            setTimeout(() => this.handleTextSelection(e), 100);
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+N or Cmd+Shift+N to open quick note
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                this.openSidepanel();
            }
            
            // Escape to hide selection button
            if (e.key === 'Escape') {
                this.hideQuickNoteButton();
            }
        });

        // Quick note button click
        this.quickNoteButton.addEventListener('click', () => {
            this.saveSelectedTextAsNote();
        });

        // Hide button when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (e.target !== this.quickNoteButton && !window.getSelection().toString()) {
                this.hideQuickNoteButton();
            }
        });

        // Handle scroll to reposition button
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (this.quickNoteButton.style.display !== 'none') {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.updateButtonPosition();
                }, 100);
            }
        });
    }

    // Handle text selection and show/hide quick note button
    handleTextSelection(e) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText && selectedText.length > 0) {
            this.selectedText = selectedText;
            this.showQuickNoteButton(e);
        } else {
            this.hideQuickNoteButton();
        }
    }

    // Show quick note button near the selection
    showQuickNoteButton(e) {
        if (!this.isEnabled) return;

        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Position button near the selection
        const buttonX = Math.min(rect.right + 10, window.innerWidth - 50);
        const buttonY = Math.max(rect.top - 10, 10);

        Object.assign(this.quickNoteButton.style, {
            display: 'flex',
            left: buttonX + 'px',
            top: (buttonY + window.scrollY) + 'px'
        });

        // Add animation
        this.quickNoteButton.style.opacity = '0';
        this.quickNoteButton.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            this.quickNoteButton.style.opacity = '1';
            this.quickNoteButton.style.transform = 'scale(1)';
        }, 10);
    }

    // Hide quick note button
    hideQuickNoteButton() {
        this.quickNoteButton.style.display = 'none';
        this.selectedText = '';
    }

    // Update button position on scroll
    updateButtonPosition() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) {
            this.hideQuickNoteButton();
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            this.hideQuickNoteButton();
        }
    }

    // Save selected text as a new note
    saveSelectedTextAsNote() {
        if (!this.selectedText) return;

        const noteData = {
            title: this.selectedText.substring(0, 50) + (this.selectedText.length > 50 ? '...' : ''),
            content: this.selectedText,
            url: window.location.href,
            domain: window.location.hostname,
            timestamp: new Date().toISOString(),
            folder: 'web-clips'
        };

        // Send note data to background script
        chrome.runtime.sendMessage({
            action: 'saveNote',
            noteData: noteData
        }, (response) => {
            if (response && response.success) {
                this.showSuccessMessage('Note saved!');
                this.openSidepanel();
            } else {
                this.showErrorMessage('Failed to save note');
            }
        });

        this.hideQuickNoteButton();
    }

    // Open sidepanel
    openSidepanel() {
        chrome.runtime.sendMessage({
            action: 'openSidepanel'
        });
    }

    // Show success message
    showSuccessMessage(message) {
        this.showToast(message, '#059669');
    }

    // Show error message
    showErrorMessage(message) {
        this.showToast(message, '#dc2626');
    }

    // Show toast notification
    showToast(message, backgroundColor) {
        const toast = document.createElement('div');
        toast.textContent = message;
        
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: backgroundColor,
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '10001',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transform: 'translateY(-20px)',
            opacity: '0',
            transition: 'all 0.3s ease'
        });

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateY(-20px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Setup message listener for communication with background script
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'getSelectedText':
                    sendResponse({ selectedText: this.selectedText || window.getSelection().toString() });
                    break;
                    
                case 'capturePageInfo':
                    sendResponse({
                        title: document.title,
                        url: window.location.href,
                        domain: window.location.hostname,
                        selectedText: window.getSelection().toString()
                    });
                    break;

                case 'toggleQuickNotes':
                    this.isEnabled = !this.isEnabled;
                    if (!this.isEnabled) {
                        this.hideQuickNoteButton();
                    }
                    sendResponse({ enabled: this.isEnabled });
                    break;

                case 'highlightText':
                    this.highlightSelectedText(message.color || '#ffeb3b');
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
            }
        });
    }

    // Highlight selected text on the page
    highlightSelectedText(color = '#ffeb3b') {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.backgroundColor = color;
        span.style.color = '#000';
        span.classList.add('quicknotes-highlight');
        
        try {
            range.surroundContents(span);
            selection.removeAllRanges();
        } catch (e) {
            // If surroundContents fails, try alternative method
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
        }
    }

    // Get page content for analysis
    getPageContent() {
        return {
            title: document.title,
            url: window.location.href,
            domain: window.location.hostname,
            headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent.trim()),
            paragraphs: Array.from(document.querySelectorAll('p')).map(p => p.textContent.trim()).filter(text => text.length > 50),
            links: Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.textContent.trim(), href: a.href }))
        };
    }
}

// Initialize the content script when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new QuickNotesContent();
    });
} else {
    new QuickNotesContent();
}

// Prevent multiple initializations
if (!window.quickNotesInitialized) {
    window.quickNotesInitialized = true;
}