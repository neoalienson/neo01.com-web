// JSON Minify/Prettify - Converted from IT-Tools
class JsonMinify {
    constructor() {
        this.jsonInput = document.getElementById('jsonInput');
        this.result = document.getElementById('result');
        this.sortKeysCheckbox = document.getElementById('sortKeys');
        this.indentSizeInput = document.getElementById('indentSize');
        
        this.init();
    }
    
    init() {
        this.jsonInput.addEventListener('input', () => this.autoPrettify());
        this.sortKeysCheckbox.addEventListener('change', () => this.autoPrettify());
        this.indentSizeInput.addEventListener('input', () => this.autoPrettify());
        this.autoPrettify();
    }
    
    autoPrettify() {
        const json = this.jsonInput.value;
        if (json.trim()) {
            try {
                const parsed = JSON.parse(json);
                const sortKeys = this.sortKeysCheckbox.checked;
                const indent = parseInt(this.indentSizeInput.value) || 2;
                this.result.textContent = this.prettify(json, sortKeys, indent);
                this.clearError();
            } catch (error) {
                this.showError('Invalid JSON: ' + error.message);
            }
        } else {
            this.result.textContent = '';
            this.clearError();
        }
    }
    
    prettify(json, sortKeys = false, indent = 2) {
        try {
            const parsed = JSON.parse(json);
            const replacer = sortKeys ? this.sortObjectKeys : null;
            return JSON.stringify(parsed, replacer, indent);
        } catch (error) {
            throw new Error('Invalid JSON: ' + error.message);
        }
    }
    
    sortObjectKeys(key, value) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const sorted = {};
            Object.keys(value).sort().forEach(k => {
                sorted[k] = value[k];
            });
            return sorted;
        }
        return value;
    }
    
    minify(json) {
        try {
            const parsed = JSON.parse(json);
            return JSON.stringify(parsed);
        } catch (error) {
            throw new Error('Invalid JSON: ' + error.message);
        }
    }
    
    showError(message) {
        this.result.textContent = message;
        this.result.parentElement.classList.add('error');
    }
    
    clearError() {
        this.result.parentElement.classList.remove('error');
    }
}

// Global functions for buttons
function prettifyJson() {
    const jsonInput = document.getElementById('jsonInput');
    const result = document.getElementById('result');
    const sortKeysCheckbox = document.getElementById('sortKeys');
    const indentSizeInput = document.getElementById('indentSize');
    const json = jsonInput.value;
    
    if (json.trim()) {
        try {
            const minifier = new JsonMinify();
            const sortKeys = sortKeysCheckbox.checked;
            const indent = parseInt(indentSizeInput.value) || 2;
            result.textContent = minifier.prettify(json, sortKeys, indent);
            minifier.clearError();
        } catch (error) {
            const minifier = new JsonMinify();
            minifier.showError(error.message);
        }
    }
}

function minifyJson() {
    const jsonInput = document.getElementById('jsonInput');
    const result = document.getElementById('result');
    const json = jsonInput.value;
    
    if (json.trim()) {
        try {
            const minifier = new JsonMinify();
            result.textContent = minifier.minify(json);
            minifier.clearError();
        } catch (error) {
            const minifier = new JsonMinify();
            minifier.showError(error.message);
        }
    }
}

function copyResult() {
    const result = document.getElementById('result');
    const text = result.textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess();
        }).catch(err => {
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess();
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
}

function showCopySuccess() {
    const btn = document.querySelector('.copy-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#28a745';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '#007acc';
    }, 2000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JsonMinify();
});