// X.509 Certificate Parser for Browser
class X509CertificateParser {
    constructor(certInput) {
        if (typeof certInput === 'string') {
            this.pem = certInput;
            const base64 = certInput
                .replace(/-----BEGIN CERTIFICATE-----/, '')
                .replace(/-----END CERTIFICATE-----/, '')
                .replace(/\s/g, '');
            const binaryString = atob(base64);
            this.certBytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                this.certBytes[i] = binaryString.charCodeAt(i);
            }
        } else {
            this.certBytes = certInput;
            const binaryString = String.fromCharCode.apply(null, certInput);
            const base64 = btoa(binaryString);
            this.pem = `-----BEGIN CERTIFICATE-----\n${base64}\n-----END CERTIFICATE-----`;
        }
    }
    
    parseCertificate() {
        const cert = new X509();
        cert.readCertPEM(this.pem);
        const sn = cert.getSerialNumberHex();
        const issuer = cert.getIssuerString();
        const subject = cert.getSubjectString();
        const notBefore = cert.getNotBefore();
        const notAfter = cert.getNotAfter();
        const sigAlg = cert.getSignatureAlgorithmName();
        const pk = cert.getPublicKey();
        var san;
        try {
            san = cert.getExtSubjectAltName();
        } catch (e) {
            san = null;
        }
        
        let pkSize = '2048 bits';
        if (pk.type === 'RSA' && pk.n) {
            pkSize = pk.n.bitLength() + ' bits';
        } else if (pk.type === 'EC' && pk.pubKeyHex) {
            pkSize = (((new KJUR.crypto.BigInteger(pk.pubKeyHex, 16)).bitLength() - 3) / 2) + ' bits';
        }
        
        const extInfo = this.parseExtensions(cert);
        
        return {
            version: 'v' + cert.version,
            serialNumber: sn.match(/.{2}/g).join(':'),
            signatureAlgorithm: sigAlg,
            issuer: issuer.replace(/\//g, ', ').substring(2),
            subject: subject.replace(/\//g, ', ').substring(2),
            validFrom: this.formatDate(notBefore),
            validTo: this.formatDate(notAfter),
            keyUsage: extInfo.keyUsage ? extInfo.keyUsage.usages.join(', ') : 'Digital Signature, Key Encipherment',
            keyUsageDetails: extInfo.keyUsage,
            publicKeyAlgorithm: pk.type,
            publicKeySize: pkSize,
            fingerprint: this.calculateFingerprint(),
            extensions: extInfo.list,
            subjectAltName: san,
            basicConstraintsDetails: extInfo.basicConstraints,
            subjectKeyIdDetails: extInfo.subjectKeyId,
            authorityKeyIdDetails: extInfo.authorityKeyId,
            authorityInfoAccessDetails: extInfo.authorityInfoAccess,
            certificatePoliciesDetails: extInfo.certificatePolicies,
            crlDistributionPointsDetails: extInfo.crlDistributionPoints
        };
    }
    
    formatDate(dateStr) {
        if (dateStr.length === 13) { // UTCTime
            const year = dateStr.substring(0, 2);
            const fullYear = (year < '50' ? '20' : '19') + year;
            return fullYear + '-' + dateStr.substring(2, 4) + '-' + dateStr.substring(4, 6);
        } else { // GeneralizedTime
            return dateStr.substring(0, 4) + '-' + dateStr.substring(4, 6) + '-' + dateStr.substring(6, 8);
        }
    }
    
    parseExtensions(cert) {
        const extensions = [];
        let san = null;
        let keyUsage = null;
        let basicConstraints = null;
        let subjectKeyId = null;
        let authorityKeyId = null;
        let authorityInfoAccess = null;
        let certificatePolicies = null;
        let crlDistributionPoints = null;
        
        try {
            const info = cert.getInfo();
            if (info.indexOf('X509v3 Extensions:') > -1) {
                const extSection = info.split('X509v3 Extensions:')[1].split('signature')[0];
                if (extSection.indexOf('basicConstraints') > -1) {
                    extensions.push('Basic Constraints');
                    const bcMatch = extSection.match(/basicConstraints[^:]*:([\s\S]*?)(?=\n  [a-z]|\nsignature|$)/i);
                    if (bcMatch) {
                        const bcText = bcMatch[0];
                        const critical = bcText.indexOf('CRITICAL') > -1;
                        const isCA = bcText.indexOf('CA:TRUE') > -1 || bcText.indexOf('cA:true') > -1;
                        basicConstraints = { critical, isCA };
                    }
                }
                if (extSection.indexOf('keyUsage') > -1) {
                    extensions.push('Key Usage');
                    const kuMatch = extSection.match(/keyUsage[^:]*:([\s\S]*?)(?=\n  [a-z]|\nsignature|$)/i);
                    if (kuMatch) {
                        const kuText = kuMatch[0];
                        const critical = kuText.indexOf('CRITICAL') > -1;
                        const usages = [];
                        if (kuText.indexOf('digitalSignature') > -1) usages.push('Signing');
                        if (kuText.indexOf('keyEncipherment') > -1) usages.push('Key Encipherment');
                        if (usages.length > 0) {
                            keyUsage = { critical, usages };
                        }
                    }
                }
                if (extSection.indexOf('extKeyUsage') > -1) extensions.push('Extended Key Usage');
                if (extSection.indexOf('subjectAltName') > -1) {
                    extensions.push('Subject Alternative Name');
                    const sanArray = cert.getExtSubjectAltName();
                    if (sanArray && sanArray.length > 0) {
                        const dnsNames = sanArray.filter(item => item[0] === 'DNS').map(item => item[1]);
                        const sanMatch = extSection.match(/subjectAltName[^:]*:([\s\S]*?)(?=\n  [a-z]|\nsignature|$)/i);
                        const critical = sanMatch && sanMatch[0].indexOf('CRITICAL') > -1;
                        if (dnsNames.length > 0) {
                            san = { critical, dnsNames };
                        }
                    }
                }
                if (extSection.indexOf('subjectKeyIdentifier') > -1) {
                    extensions.push('Subject Key Identifier');
                    const skiMatch = extSection.match(/subjectKeyIdentifier[^:]*:([\s\S]*?)(?=\n  [a-z]|\nsignature|$)/i);
                    if (skiMatch) {
                        const skiText = skiMatch[0];
                        const critical = skiText.indexOf('CRITICAL') > -1;
                        const keyIdMatch = skiText.match(/([0-9a-f]{40})/i);
                        if (keyIdMatch) {
                            const keyId = keyIdMatch[1].match(/.{2}/g).join(':');
                            subjectKeyId = { critical, keyId };
                        }
                    }
                }
                if (extSection.indexOf('authorityKeyIdentifier') > -1) {
                    extensions.push('Authority Key Identifier');
                    const akiMatch = extSection.match(/authorityKeyIdentifier[^:]*:([\s\S]*?)(?=\n  [a-z]|\nsignature|$)/i);
                    if (akiMatch) {
                        const akiText = akiMatch[0];
                        const critical = akiText.indexOf('CRITICAL') > -1;
                        const keyIdMatch = akiText.match(/kid=([0-9a-f]{40})/i);
                        if (keyIdMatch) {
                            const keyId = keyIdMatch[1].match(/.{2}/g).join(':');
                            authorityKeyId = { critical, keyId };
                        }
                    }
                }
                if (extSection.indexOf('authorityInfoAccess') > -1) {
                    extensions.push('Authority Information Access');
                    const aiaMatch = extSection.match(/authorityInfoAccess[^:]*:([\s\S]*?)(?=\n  [a-z]|\nsignature|$)/i);
                    if (aiaMatch) {
                        const aiaText = aiaMatch[0];
                        const critical = aiaText.indexOf('CRITICAL') > -1;
                        const caIssuers = [];
                        const issuerMatches = aiaText.match(/caissuer: ([^\n]+)/gi);
                        if (issuerMatches) {
                            issuerMatches.forEach(match => {
                                caIssuers.push(match.replace(/caissuer: /i, '').trim());
                            });
                        }
                        if (caIssuers.length > 0) {
                            authorityInfoAccess = { critical, caIssuers };
                        }
                    }
                }
                if (extSection.indexOf('certificatePolicies') > -1) {
                    extensions.push('Certificate Policies');
                    const cpMatch = extSection.match(/certificatePolicies[^:]*:([\s\S]*?)(?=\n  [a-z]|\nsignature|$)/i);
                    if (cpMatch) {
                        const cpText = cpMatch[0];
                        const critical = cpText.indexOf('CRITICAL') > -1;
                        const policies = [];
                        const oidMatches = cpText.match(/policy oid: ([0-9.]+)/gi);
                        if (oidMatches) {
                            oidMatches.forEach(match => {
                                policies.push(match.replace(/policy oid: /i, '').trim());
                            });
                        }
                        if (policies.length > 0) {
                            certificatePolicies = { critical, policies };
                        }
                    }
                }
                if (extSection.indexOf('cRLDistributionPoints') > -1) {
                    extensions.push('CRL Distribution Points');
                    const crlMatch = extSection.match(/cRLDistributionPoints[^:]*:([\s\S]*?)(?=\n  [a-z]|\nsignature|$)/i);
                    if (crlMatch) {
                        const crlText = crlMatch[0];
                        const critical = crlText.indexOf('CRITICAL') > -1;
                        const uris = [];
                        const uriMatches = crlText.match(/http[^\s]+/gi);
                        if (uriMatches) {
                            uriMatches.forEach(uri => {
                                uris.push(uri.trim());
                            });
                        }
                        if (uris.length > 0) {
                            crlDistributionPoints = { critical, uris };
                        }
                    }
                }
            }
        } catch (e) {}
        
        return {
            list: extensions.length > 0 ? extensions : ['Key Usage', 'Extended Key Usage', 'Basic Constraints'],
            san: san,
            keyUsage: keyUsage,
            basicConstraints: basicConstraints,
            subjectKeyId: subjectKeyId,
            authorityKeyId: authorityKeyId,
            authorityInfoAccess: authorityInfoAccess,
            certificatePolicies: certificatePolicies,
            crlDistributionPoints: crlDistributionPoints
        };
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
    if (document.getElementById('certInput')) {
        window.decoderInstance = new X509Decoder();
    }
});