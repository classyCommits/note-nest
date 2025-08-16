class SettingsManager {
    constructor() {
        this.settings = {
            fontSize: '14',
            autoSave: true,
            confirmDelete: true
        };
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['settings']);
            if (result.settings) {
                this.settings = { ...this.settings, ...result.settings };
                this._validateSettings();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    _validateSettings() {
        // Validate fontSize
        const fontSize = parseInt(this.settings.fontSize, 10);
        if (isNaN(fontSize) || fontSize < 8 || fontSize > 72) {
            this.settings.fontSize = '14';
        }
        
        // Validate boolean settings
        if (typeof this.settings.autoSave !== 'boolean') {
            this.settings.autoSave = true;
        }
        if (typeof this.settings.confirmDelete !== 'boolean') {
            this.settings.confirmDelete = true;
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.local.set({ settings: this.settings });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
}

export default SettingsManager;