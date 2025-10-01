// ASN.1 Parser for Node.js
class ASN1Parser {
    constructor(bytes) {
        this.bytes = bytes;
        this.pos = 0;
    }
    
    readByte() {
        return this.bytes[this.pos++];
    }
    
    readLength() {
        const first = this.readByte();
        if ((first & 0x80) === 0) {
            return first;
        }
        
        const lengthBytes = first & 0x7f;
        let length = 0;
        for (let i = 0; i < lengthBytes; i++) {
            length = (length << 8) | this.readByte();
        }
        return length;
    }
    
    readSequence() {
        const tag = this.readByte();
        const length = this.readLength();
        const start = this.pos;
        return { tag, length, start, end: start + length };
    }
    
    readInteger() {
        const seq = this.readSequence();
        const bytes = this.bytes.slice(seq.start, seq.end);
        this.pos = seq.end;
        
        // Skip leading zero bytes
        let startIdx = 0;
        while (startIdx < bytes.length - 1 && bytes[startIdx] === 0) {
            startIdx++;
        }
        const relevantBytes = bytes.slice(startIdx);
        
        return Array.from(relevantBytes, b => b.toString(16).padStart(2, '0')).join(':');
    }
    
    readString() {
        const seq = this.readSequence();
        const bytes = this.bytes.slice(seq.start, seq.end);
        this.pos = seq.end;
        return String.fromCharCode(...bytes.filter(b => b >= 32 && b <= 126));
    }
    
    readOID() {
        const seq = this.readSequence();
        const bytes = this.bytes.slice(seq.start, seq.end);
        this.pos = seq.end;
        
        if (bytes.length === 0) return 'unknown';
        
        const oid = [];
        oid.push(Math.floor(bytes[0] / 40));
        oid.push(bytes[0] % 40);
        
        let value = 0;
        for (let i = 1; i < bytes.length; i++) {
            value = (value << 7) | (bytes[i] & 0x7f);
            if ((bytes[i] & 0x80) === 0) {
                oid.push(value);
                value = 0;
            }
        }
        
        const oidStr = oid.join('.');
        return this.getOIDName(oidStr);
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
        const extensions = {
            '2.5.29.15': 'Key Usage',
            '2.5.29.19': 'Basic Constraints',
            '2.5.29.14': 'Subject Key Identifier',
            '2.5.29.35': 'Authority Key Identifier'
        };
        return extensions[oid] || oid;
    }
    
    readTime() {
        const seq = this.readSequence();
        const bytes = this.bytes.slice(seq.start, seq.end);
        this.pos = seq.end;
        const timeStr = String.fromCharCode(...bytes);
        
        if (timeStr.length === 13) {
            const year = parseInt(timeStr.substr(0, 2));
            const fullYear = year < 50 ? 2000 + year : 1900 + year;
            const month = parseInt(timeStr.substr(2, 2));
            const day = parseInt(timeStr.substr(4, 2));
            return `${fullYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        } else if (timeStr.length === 15) {
            const year = parseInt(timeStr.substr(0, 4));
            const month = parseInt(timeStr.substr(4, 2));
            const day = parseInt(timeStr.substr(6, 2));
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
        return timeStr;
    }
    
    calculateFingerprint() {
        const hash = require('crypto').createHash('sha1');
        hash.update(Buffer.from(this.bytes));
        return hash.digest('hex').match(/.{2}/g).join(':');
    }
    
    parseCertificate() {
        try {
            this.readSequence();
            const tbsSeq = this.readSequence();
            
            let version = 'v1';
            if (this.bytes[this.pos] === 0xa0) {
                this.readSequence();
                this.readSequence();
                const versionNum = this.readByte();
                version = `v${versionNum + 1}`;
            }
            
            const serialNumber = this.readInteger();
            
            this.readSequence();
            const signatureAlgorithm = this.readOID();
            
            const issuer = this.parseName();
            
            this.readSequence();
            const validFrom = this.readTime();
            const validTo = this.readTime();
            
            const subject = this.parseName();
            
            return {
                version,
                serialNumber,
                signatureAlgorithm,
                issuer,
                subject,
                validFrom,
                validTo
            };
        } catch (e) {
            return {
                version: 'Parse Error',
                serialNumber: 'Parse Error',
                signatureAlgorithm: 'Parse Error',
                issuer: 'Parse Error',
                subject: 'Parse Error',
                validFrom: 'Parse Error',
                validTo: 'Parse Error'
            };
        }
    }
    
    parseName() {
        try {
            const nameSeq = this.readSequence();
            const endPos = nameSeq.end;
            const parts = [];
            
            while (this.pos < endPos) {
                this.readSequence();
                this.readSequence();
                const oid = this.readOID();
                const value = this.readString();
                if (oid === 'CN' || oid === '2.5.4.3') {
                    parts.push(`CN=${value}`);
                } else {
                    parts.push(`${oid}=${value}`);
                }
            }
            
            return parts.join(', ') || 'Parse Error';
        } catch (e) {
            return 'Parse Error';
        }
    }
}

module.exports = ASN1Parser;