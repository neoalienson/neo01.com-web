// Device Information Tool
class DeviceInformation {
    constructor() {
        this.container = document.getElementById('deviceInfo');
        this.init();
    }
    
    init() {
        this.displayDeviceInfo();
        window.addEventListener('resize', () => this.updateWindowSize());
    }
    
    async displayDeviceInfo() {
        const sections = [
            {
                title: 'Screen',
                items: this.getScreenInfo()
            },
            {
                title: 'Device',
                items: this.getDeviceInfo()
            },
            {
                title: 'AI Capabilities',
                items: await this.getAIInfo()
            }
        ];
        
        sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'info-section';
            sectionDiv.innerHTML = `
                <h3>${section.title}</h3>
                ${section.items.map(item => `
                    <div class="info-item">
                        <span class="info-label">${item.label}</span>
                        <span class="info-value" id="${item.id || ''}">
                            ${item.value}
                        </span>
                    </div>
                `).join('')}
            `;
            this.container.appendChild(sectionDiv);
        });
        
        // Add user agent as separate block
        const userAgentDiv = document.createElement('div');
        userAgentDiv.className = 'user-agent-block';
        userAgentDiv.innerHTML = `
            <h3>User Agent</h3>
            <div class="user-agent-text">${navigator.userAgent}</div>
            <button class="copy-btn" onclick="copyText('${navigator.userAgent.replace(/'/g, "\\'")}')">Copy</button>
        `;
        this.container.appendChild(userAgentDiv);
    }
    
    getScreenInfo() {
        return [
            { label: 'Screen size', value: `${screen.availWidth} x ${screen.availHeight}` },
            { label: 'Orientation', value: screen.orientation?.type || 'unknown' },
            { label: 'Orientation angle', value: screen.orientation?.angle !== undefined ? `${screen.orientation.angle}°` : 'unknown' },
            { label: 'Color depth', value: `${screen.colorDepth} bits` },
            { label: 'Pixel ratio', value: `${window.devicePixelRatio} dppx` },
            { label: 'Window size', value: `${window.innerWidth} x ${window.innerHeight}`, id: 'windowSize' }
        ];
    }
    
    getDeviceInfo() {
        return [
            { label: 'Browser vendor', value: navigator.vendor || 'unknown' },
            { label: 'Languages', value: navigator.languages?.join(', ') || 'unknown' },
            { label: 'Platform', value: navigator.platform || 'unknown' }
        ];
    }
    
    async getAIInfo() {
        const aiInfo = [];
        
        try {
            if ('LanguageModel' in self) {
                const availability = await LanguageModel.availability();
                aiInfo.push({ label: 'Language Model', value: availability });
            
            } else {
                aiInfo.push({ label: 'Language Model', value: 'not supported' });
            }

            aiInfo.push({ label: 'Summarizer API',
                value: ('Summarizer' in self) ? 'supported' : 'not supported' });
            aiInfo.push({ label: 'Proofreader API',
                value: ('Proofreader' in self) ? 'supported' : 'not supported' });
            aiInfo.push({ label: 'LanguageDetector API',
                value: ('LanguageDetector' in self) ? 'supported' : 'not supported' });                  
            aiInfo.push({ label: 'Translator API',
                value: ('Translator' in self) ? 'supported' : 'not supported' });                  
            aiInfo.push({ label: 'Writer API',
                value: ('Writer' in self) ? 'supported' : 'not supported' });                  
            aiInfo.push({ label: 'Rewriter API',
                value: ('Rewriter' in self) ? 'supported' : 'not supported' });                  
                

        } catch (error) {
            aiInfo.push({ label: 'Language Model', value: 'error checking' });
        }
        
        return aiInfo;
    }
    
    updateWindowSize() {
        const windowSizeElement = document.getElementById('windowSize');
        if (windowSizeElement) {
            windowSizeElement.textContent = `${window.innerWidth} x ${window.innerHeight}`;
        }
    }
}

// Copy text to clipboard
function copyText(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(event.target);
        }).catch(err => {
            fallbackCopyTextToClipboard(text, event.target);
        });
    } else {
        fallbackCopyTextToClipboard(text, event.target);
    }
}

function fallbackCopyTextToClipboard(text, button) {
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
        showCopySuccess(button);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
}

function showCopySuccess(button) {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.background = '#28a745';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '#007acc';
    }, 2000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    new DeviceInformation();
});