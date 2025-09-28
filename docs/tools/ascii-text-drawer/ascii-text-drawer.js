// ASCII Text Drawer - Converted from IT-Tools
class AsciiTextDrawer {
    constructor() {
        this.textInput = document.getElementById('textInput');
        this.output = document.getElementById('output');
        this.fonts = ['Standard', 'Big', 'Small', 'Block', 'Banner', 'Digital', 'Doom', 'Slant', 'Shadow', 'Speed'];
        
        this.init();
    }
    
    init() {
        this.textInput.addEventListener('input', () => this.generateAllAscii());
        this.generateAllAscii();
    }
    
    generateAllAscii() {
        const text = this.textInput.value || 'HELLO';
        this.output.innerHTML = '';
        
        this.fonts.forEach(font => {
            figlet(text, {
                font: font,
                horizontalLayout: 'default',
                verticalLayout: 'default'
            }, (err, data) => {
                if (!err) {
                    const fontDiv = document.createElement('div');
                    fontDiv.className = 'font-result';
                    fontDiv.innerHTML = `<div class="font-name">${font.toUpperCase()}</div><pre>${data}</pre>`;
                    this.output.appendChild(fontDiv);
                }
            });
        });
    }
}

// Copy to clipboard function
function copyToClipboard() {
    const output = document.getElementById('output');
    const text = output.textContent;
    
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
    // Wait for figlet to be available
    if (typeof figlet !== 'undefined') {
        new AsciiTextDrawer();
    } else {
        // Retry after a short delay if figlet isn't loaded yet
        setTimeout(() => {
            new AsciiTextDrawer();
        }, 100);
    }
});