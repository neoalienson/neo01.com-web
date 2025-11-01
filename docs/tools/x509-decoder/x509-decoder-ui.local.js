// X.509 Certificate Decoder UI
class X509Decoder {
    constructor() {
        this.certInput = document.getElementById('certInput');
        this.output = document.getElementById('output');
        
        this.init();
    }
    
    init() {
        this.certInput.addEventListener('input', () => this.autoDecode());
    }
    
    autoDecode() {
        const cert = this.certInput.value.trim();
        if (cert && cert.includes('BEGIN CERTIFICATE')) {
            this.decodeCertificate(cert);
        } else {
            this.output.innerHTML = '';
        }
    }
    
    decodeCertificate(pemCert) {
        try {
            const parser = new X509CertificateParser(pemCert);
            const certInfo = parser.parseCertificate();
            this.displayResults(certInfo);
        } catch (error) {
            this.showError('Invalid certificate format or parsing error');
        }
    }
    
    calculateFingerprint(bytes) {
        // Simplified fingerprint calculation
        let hash = 0;
        for (let i = 0; i < bytes.length; i++) {
            hash = ((hash << 5) - hash + bytes[i]) & 0xffffffff;
        }
        return Math.abs(hash).toString(16).padStart(8, '0').match(/.{2}/g).join(':');
    }
    
    displayResults(certInfo) {
        this.output.innerHTML = '';
        this.currentCertInfo = certInfo;
        
        const results = [
            { name: 'Version', value: certInfo.version },
            { name: 'Serial Number', value: certInfo.serialNumber },
            { name: 'Signature Algorithm', value: certInfo.signatureAlgorithm },
            { name: 'Issuer', value: certInfo.issuer },
            { name: 'Subject', value: certInfo.subject },
            { name: 'Valid From', value: certInfo.validFrom },
            { name: 'Valid To', value: certInfo.validTo },
            { name: 'Key Usage', value: certInfo.keyUsage },
            { name: 'Public Key Algorithm', value: certInfo.publicKeyAlgorithm },
            { name: 'Public Key Size', value: certInfo.publicKeySize },
            { name: 'Fingerprint (SHA-1)', value: certInfo.fingerprint },
            { name: 'Extensions', value: certInfo.extensions.join(', ') }
        ];
        
        results.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'cert-result';
            resultDiv.innerHTML = `
                <button class="copy-individual" onclick="copyText('${result.value}')">Copy</button>
                <div class="cert-name">${result.name}</div>
                <div class="cert-output">${result.value}</div>
            `;
            this.output.appendChild(resultDiv);
        });
        
        // Display text output
        const textOutput = document.getElementById('textOutput');
        const textContent = document.getElementById('textContent');
        textContent.textContent = this.generateTextOutput();
        textOutput.style.display = 'block';
    }
    
    generateTextOutput() {
        if (!this.currentCertInfo) return '';
        
        const info = this.currentCertInfo;
        let output = `X.509 Certificate Information
=============================

Version: ${info.version}
Serial Number: ${info.serialNumber}
Signature Algorithm: ${info.signatureAlgorithm}
Issuer: ${info.issuer}
Subject: ${info.subject}
Valid From: ${info.validFrom}
Valid To: ${info.validTo}
Public Key Algorithm: ${info.publicKeyAlgorithm}
Public Key Size: ${info.publicKeySize}
Fingerprint (SHA-1): ${info.fingerprint}

Extensions:
-----------
`;
        
        if (info.keyUsageDetails) {
            output += `\nKey Usage (${info.keyUsageDetails.critical ? 'Critical' : 'Not Critical'}):\n`;
            info.keyUsageDetails.usages.forEach(usage => {
                output += `  - ${usage}\n`;
            });
        }
        
        if (info.basicConstraintsDetails) {
            output += `\nBasic Constraints (${info.basicConstraintsDetails.critical ? 'Critical' : 'Not Critical'}):\n`;
            output += `  CA: ${info.basicConstraintsDetails.isCA ? 'TRUE' : 'FALSE'}\n`;
        }
        
        if (info.subjectKeyIdDetails) {
            output += `\nSubject Key Identifier (${info.subjectKeyIdDetails.critical ? 'Critical' : 'Not Critical'}):\n`;
            output += `  ${info.subjectKeyIdDetails.keyId}\n`;
        }
        
        if (info.authorityKeyIdDetails) {
            output += `\nAuthority Key Identifier (${info.authorityKeyIdDetails.critical ? 'Critical' : 'Not Critical'}):\n`;
            output += `  ${info.authorityKeyIdDetails.keyId}\n`;
        }
        
        if (info.subjectAltName) {
            const san = info.subjectAltName;
            if (Array.isArray(san)) {
                output += `\nSubject Alternative Name:\n`;
                san.forEach(item => {
                    output += `  ${item}\n`;
                });
            } else if (san.dnsNames) {
                output += `\nSubject Alternative Name (${san.critical ? 'Critical' : 'Not Critical'}):\n`;
                san.dnsNames.forEach(dns => {
                    output += `  DNS: ${dns}\n`;
                });
            }
        }
        
        if (info.authorityInfoAccessDetails) {
            output += `\nAuthority Information Access (${info.authorityInfoAccessDetails.critical ? 'Critical' : 'Not Critical'}):\n`;
            info.authorityInfoAccessDetails.caIssuers.forEach(uri => {
                output += `  CA Issuers: ${uri}\n`;
            });
        }
        
        if (info.certificatePoliciesDetails) {
            output += `\nCertificate Policies (${info.certificatePoliciesDetails.critical ? 'Critical' : 'Not Critical'}):\n`;
            info.certificatePoliciesDetails.policies.forEach(policy => {
                output += `  Policy OID: ${policy}\n`;
            });
        }
        
        if (info.crlDistributionPointsDetails) {
            output += `\nCRL Distribution Points (${info.crlDistributionPointsDetails.critical ? 'Critical' : 'Not Critical'}):\n`;
            info.crlDistributionPointsDetails.uris.forEach(uri => {
                output += `  URI: ${uri}\n`;
            });
        }
        
        output += `\nGenerated on: ${new Date().toISOString()}`;
        return output;
    }
    
    showError(message) {
        this.output.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'cert-result error';
        errorDiv.innerHTML = `
            <div class="cert-name">Error</div>
            <div class="cert-output">${message}</div>
        `;
        this.output.appendChild(errorDiv);
    }
}

// Global functions
function decodeCertificate() {
    const decoder = new X509Decoder();
    const cert = document.getElementById('certInput').value;
    if (cert.trim()) {
        decoder.decodeCertificate(cert);
    } else {
        decoder.showError('Please enter a certificate');
    }
}

function clearInput() {
    document.getElementById('certInput').value = '';
    document.getElementById('output').innerHTML = '';
    document.getElementById('textOutput').style.display = 'none';
}

function copyTextOutput() {
    const textContent = document.getElementById('textContent').textContent;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textContent).then(() => {
            showCopySuccess(event.target);
        }).catch(err => {
            fallbackCopyTextToClipboard(textContent, event.target);
        });
    } else {
        fallbackCopyTextToClipboard(textContent, event.target);
    }
}

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
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('certInput')) {
        window.decoderInstance = new X509Decoder();
    }
});
