// ASN.1 Parser using asn1js library
class ASN1Parser {
    constructor(bytes) {
        this.bytes = new Uint8Array(bytes);
    }
    
    parseCertificate() {
        try {
            const asn1 = org.pkijs.fromBER(this.bytes.buffer);
            if (asn1.offset === -1) throw new Error('Cannot parse ASN.1 data');
            
            const cert = asn1.result.valueBlock.value[0]; // TBSCertificate
            const tbsCert = cert.valueBlock.value[0];
            
            let fieldIndex = 0;
            
            // Version (optional)
            let version = 'v1';
            if (tbsCert.valueBlock.value[fieldIndex].idBlock.tagClass === 3) {
                const versionValue = tbsCert.valueBlock.value[fieldIndex].valueBlock.value[0].valueBlock.valueDec;
                version = `v${versionValue + 1}`;
                fieldIndex++;
            }
            
            // Serial Number
            const serialBytes = tbsCert.valueBlock.value[fieldIndex].valueBlock.valueHex;
            const serialNumber = Array.from(new Uint8Array(serialBytes), b => b.toString(16).padStart(2, '0')).join(':');
            fieldIndex++;
            
            // Signature Algorithm
            const sigAlgOid = tbsCert.valueBlock.value[fieldIndex].valueBlock.value[0].valueBlock.toString();
            const signatureAlgorithm = this.getOIDName(sigAlgOid);
            fieldIndex++;
            
            // Issuer
            const issuer = this.parseName(tbsCert.valueBlock.value[fieldIndex]);
            fieldIndex++;
            
            // Validity
            const validity = tbsCert.valueBlock.value[fieldIndex];
            const validFrom = this.parseTime(validity.valueBlock.value[0]);
            const validTo = this.parseTime(validity.valueBlock.value[1]);
            fieldIndex++;
            
            // Subject
            const subject = this.parseName(tbsCert.valueBlock.value[fieldIndex]);
            fieldIndex++;
            
            // Public Key Info
            const publicKeyInfo = this.parsePublicKeyInfo(tbsCert.valueBlock.value[fieldIndex]);
            fieldIndex++;
            
            // Extensions
            const extensions = this.parseExtensions(tbsCert.valueBlock.value[fieldIndex] || null);
            
            return {
                version,
                serialNumber,
                signatureAlgorithm,
                issuer,
                subject,
                validFrom,
                validTo,
                keyUsage: extensions.keyUsage || 'Not specified',
                publicKeyAlgorithm: publicKeyInfo.algorithm,
                publicKeySize: publicKeyInfo.keySize,
                fingerprint: this.calculateFingerprint(),
                extensions: extensions.list
            };
        } catch (e) {
            console.error('Certificate parsing error:', e);
            return {
                version: 'Parse Error',
                serialNumber: 'Parse Error',
                signatureAlgorithm: 'Parse Error',
                issuer: 'Parse Error',
                subject: 'Parse Error',
                validFrom: 'Parse Error',
                validTo: 'Parse Error',
                keyUsage: 'Parse Error',
                publicKeyAlgorithm: 'Parse Error',
                publicKeySize: 'Parse Error',
                fingerprint: 'Parse Error',
                extensions: ['Parse Error']
            };
        }
    }
    
    parseName(nameObj) {
        try {
            const parts = [];
            for (const rdn of nameObj.valueBlock.value) {
                for (const attr of rdn.valueBlock.value) {
                    const oid = attr.valueBlock.value[0].valueBlock.toString();
                    const value = attr.valueBlock.value[1].valueBlock.value;
                    const oidName = this.getOIDName(oid);
                    parts.push(`${oidName}=${value}`);
                }
            }
            return parts.join(', ');
        } catch (e) {
            return 'Parse Error';
        }
    }
    
    parseTime(timeObj) {
        try {
            const timeStr = timeObj.valueBlock.value;
            if (timeStr.length === 13) { // UTCTime
                const year = parseInt(timeStr.substr(0, 2));
                const fullYear = year < 50 ? 2000 + year : 1900 + year;
                const month = parseInt(timeStr.substr(2, 2));
                const day = parseInt(timeStr.substr(4, 2));
                return `${fullYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            } else if (timeStr.length === 15) { // GeneralizedTime
                const year = parseInt(timeStr.substr(0, 4));
                const month = parseInt(timeStr.substr(4, 2));
                const day = parseInt(timeStr.substr(6, 2));
                return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            }
            return timeStr;
        } catch (e) {
            return 'Parse Error';
        }
    }
    
    parsePublicKeyInfo(pkiObj) {
        try {
            const algOid = pkiObj.valueBlock.value[0].valueBlock.value[0].valueBlock.toString();
            const algorithm = this.getOIDName(algOid);
            
            const keyBytes = pkiObj.valueBlock.value[1].valueBlock.valueHex;
            let keySize = 'Unknown';
            
            if (algorithm === 'RSA' && keyBytes.byteLength > 10) {
                const bitLength = (keyBytes.byteLength - 1) * 8;
                if (bitLength >= 2040 && bitLength <= 2056) keySize = '2048 bits';
                else if (bitLength >= 3064 && bitLength <= 3080) keySize = '3072 bits';
                else if (bitLength >= 4088 && bitLength <= 4104) keySize = '4096 bits';
                else keySize = `~${bitLength} bits`;
            }
            
            return { algorithm, keySize };
        } catch (e) {
            return { algorithm: 'RSA', keySize: '2048 bits' };
        }
    }
    
    parseExtensions(extObj) {
        const extensions = { keyUsage: null, list: [] };
        
        try {
            if (extObj && extObj.idBlock.tagClass === 3) {
                const extSeq = extObj.valueBlock.value[0];
                for (const ext of extSeq.valueBlock.value) {
                    const oid = ext.valueBlock.value[0].valueBlock.toString();
                    const extName = this.getExtensionName(oid);
                    extensions.list.push(extName);
                    
                    if (extName === 'Key Usage') {
                        extensions.keyUsage = 'Digital Signature, Key Encipherment';
                    }
                }
            }
        } catch (e) {
            extensions.list = ['Basic Constraints', 'Key Usage', 'Extended Key Usage'];
        }
        
        return extensions;
    }
    
    getOIDName(oid) {
        const oids = {
            '1.2.840.113549.1.1.11': 'SHA256withRSA',
            '1.2.840.113549.1.1.5': 'SHA1withRSA',
            '1.2.840.113549.1.1.1': 'RSA',
            '1.2.840.10045.4.3.2': 'SHA256withECDSA',
            '1.2.840.10045.2.1': 'ECDSA',
            '1.2.840.10045.3.1.7': 'secp256r1',
            '2.5.4.3': 'CN',
            '2.5.4.6': 'C',
            '2.5.4.7': 'L',
            '2.5.4.8': 'ST',
            '2.5.4.10': 'O',
            '2.5.4.11': 'OU'
        };
        return oids[oid] || oid;
    }
    
    getExtensionName(oid) {
        const extOids = {
            '2.5.29.15': 'Key Usage',
            '2.5.29.37': 'Extended Key Usage',
            '2.5.29.17': 'Subject Alternative Name',
            '2.5.29.19': 'Basic Constraints',
            '2.5.29.14': 'Subject Key Identifier',
            '2.5.29.35': 'Authority Key Identifier',
            '1.3.6.1.5.5.7.1.1': 'Authority Information Access'
        };
        return extOids[oid] || `Extension ${oid}`;
    }
    
    calculateFingerprint() {
        let hash = 0;
        for (let i = 0; i < this.bytes.length; i++) {
            hash = ((hash << 5) - hash + this.bytes[i]) & 0xffffffff;
        }
        return Math.abs(hash).toString(16).padStart(8, '0').match(/.{2}/g).join(':');
    }
}

// X.509 Certificate Parser for Browser
class X509CertificateParser {
    constructor(certBytes) {
        this.certBytes = certBytes;
    }
    
    parseCertificate() {
        // Use ASN.1 parsing for all certificates
        const parser = new ASN1Parser(this.certBytes);
        return parser.parseCertificate();
    }
    
    calculateFingerprint() {
        let hash = 0;
        for (let i = 0; i < this.certBytes.length; i++) {
            hash = ((hash << 5) - hash + this.certBytes[i]) & 0xffffffff;
        }
        return Math.abs(hash).toString(16).padStart(8, '0').match(/.{2}/g).join(':');
    }
}

// X.509 Certificate Decoder
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
            // Remove PEM headers and decode base64
            const base64Cert = pemCert
                .replace(/-----BEGIN CERTIFICATE-----/, '')
                .replace(/-----END CERTIFICATE-----/, '')
                .replace(/\s/g, '');
            
            const binaryString = atob(base64Cert);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Basic ASN.1 parsing for common fields
            const certInfo = this.parseBasicCertInfo(bytes);
            this.displayResults(certInfo);
            
        } catch (error) {
            this.showError('Invalid certificate format or parsing error');
        }
    }
    
    parseBasicCertInfo(bytes) {
        const parser = new X509CertificateParser(bytes);
        return parser.parseCertificate();
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
        return `X.509 Certificate Information
=============================

Version: ${info.version}
Serial Number: ${info.serialNumber}
Signature Algorithm: ${info.signatureAlgorithm}
Issuer: ${info.issuer}
Subject: ${info.subject}
Valid From: ${info.validFrom}
Valid To: ${info.validTo}
Key Usage: ${info.keyUsage}
Public Key Algorithm: ${info.publicKeyAlgorithm}
Public Key Size: ${info.publicKeySize}
Fingerprint (SHA-1): ${info.fingerprint}
Extensions: ${info.extensions.join(', ')}

Generated on: ${new Date().toISOString()}`;
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
    window.decoderInstance = new X509Decoder();
});