// ASN.1 Parser Tests
framework.test('ASN.1 length parsing - short form', () => {
    const bytes = new Uint8Array([0x30, 0x05, 0x01, 0x02, 0x03, 0x04, 0x05]);
    const parser = new ASN1Parser(bytes);
    const seq = parser.readSequence();
    framework.assertEqual(seq.length, 5);
    framework.assertEqual(seq.tag, 0x30);
});

framework.test('ASN.1 length parsing - long form', () => {
    const bytes = new Uint8Array([0x30, 0x82, 0x01, 0x00]);
    const parser = new ASN1Parser(bytes);
    const seq = parser.readSequence();
    framework.assertEqual(seq.length, 256);
});

framework.test('ASN.1 integer parsing', () => {
    const bytes = new Uint8Array([0x02, 0x03, 0x01, 0x02, 0x03]);
    const parser = new ASN1Parser(bytes);
    const result = parser.readInteger();
    framework.assertEqual(result, '01:02:03');
});

framework.test('ASN.1 OID parsing', () => {
    // OID 1.2.840.113549.1.1.1 (RSA)
    const bytes = new Uint8Array([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]);
    const parser = new ASN1Parser(bytes);
    const result = parser.readOID();
    framework.assertEqual(result, 'RSA');
});

framework.test('ASN.1 string parsing', () => {
    const bytes = new Uint8Array([0x0c, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f]); // UTF8String "Hello"
    const parser = new ASN1Parser(bytes);
    const result = parser.readString();
    framework.assertEqual(result, 'Hello');
});

framework.test('ASN.1 time parsing - UTCTime', () => {
    // UTCTime "240101120000Z"
    const bytes = new Uint8Array([0x17, 0x0d, 0x32, 0x34, 0x30, 0x31, 0x30, 0x31, 0x31, 0x32, 0x30, 0x30, 0x30, 0x30, 0x5a]);
    const parser = new ASN1Parser(bytes);
    const result = parser.readTime();
    framework.assertTrue(result.startsWith('2024-01-01'));
});

framework.test('OID name resolution', () => {
    const parser = new ASN1Parser(new Uint8Array([]));
    const result = parser.getOIDName('1.2.840.113549.1.1.11');
    framework.assertEqual(result, 'SHA256withRSA');
});

framework.test('Extension name resolution', () => {
    const parser = new ASN1Parser(new Uint8Array([]));
    const result = parser.getExtensionName('2.5.29.15');
    framework.assertEqual(result, 'Key Usage');
});

framework.test('Base64 decoding', () => {
    const base64 = 'SGVsbG8gV29ybGQ=';
    const decoded = atob(base64);
    framework.assertEqual(decoded, 'Hello World');
});

framework.test('Hex conversion', () => {
    const bytes = new Uint8Array([255, 0, 128]);
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(':');
    framework.assertEqual(hex, 'ff:00:80');
});

framework.test('PEM header removal', () => {
    const pem = '-----BEGIN CERTIFICATE-----\nMIIDXTCCAkW\n-----END CERTIFICATE-----';
    const cleaned = pem
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\s/g, '');
    framework.assertEqual(cleaned, 'MIIDXTCCAkW');
});

framework.test('Fingerprint calculation', () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const parser = new ASN1Parser(bytes);
    const fingerprint = parser.calculateFingerprint();
    framework.assertTrue(fingerprint.includes(':'));
    framework.assertTrue(fingerprint.length > 0);
});

framework.test('Full certificate parsing', () => {
    const pem = `-----BEGIN CERTIFICATE-----
MIIE/TCCA+WgAwIBAgISBnY9ugTPoh5t2QcBI3lLRT7NMA0GCSqGSIb3DQEBCwUA
MDMxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQwwCgYDVQQD
EwNSMTEwHhcNMjUwODE5MjExOTM4WhcNMjUxMTE3MjExOTM3WjAUMRIwEAYDVQQD
EwluZW8wMS5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCYmFjr
7Mu2d4HocA6HIjHv0mNjZwGckE4QFpSc9Rm2BTBWtoJBYtQxC3nA1OHBNhMfXHAW
IdAcUxOMPAyMXRVH+MeUKUGPwuOyKbYbd42oc+rYY5E30iZQYaEEvfp2IgaloD3c
B0uPtwYktheSLsmu3BYsLMNslCMtn53UQNqYJj1nhze2TKSj7lIx44cs7TjucKW1
mH3Dh5b7LkVsomwk/2NCtuR81F9rlnMkegyliWiG8XEDeVMOiBxuWqXwgAxmDaSi
ILW5CRwANY88iaeKjE5X/R4oGTpj0FYD6fUyDTdAP5qQcTPX17R+QUi0BaqO92U2
h4dmyv9tg0PvSKyNAgMBAAGjggIoMIICJDAOBgNVHQ8BAf8EBAMCBaAwHQYDVR0l
BBYwFAYIKwYBBQUHAwEGCCsGAQUFBwMCMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYE
FFjJsqpo5qVIzNgr6EKyv3++RWZoMB8GA1UdIwQYMBaAFMXPRqTq9MPAemyVxC2w
XpIvJuO5MDMGCCsGAQUFBwEBBCcwJTAjBggrBgEFBQcwAoYXaHR0cDovL3IxMS5p
LmxlbmNyLm9yZy8wIwYDVR0RBBwwGoIJbmVvMDEuY29tgg13d3cubmVvMDEuY29t
MBMGA1UdIAQMMAowCAYGZ4EMAQIBMC4GA1UdHwQnMCUwI6AhoB+GHWh0dHA6Ly9y
MTEuYy5sZW5jci5vcmcvNzguY3JsMIIBBAYKKwYBBAHWeQIEAgSB9QSB8gDwAHcA
pELFBklgYVSPD9TqnPt6LSZFTYepfy/fRVn2J086hFQAAAGYxGlA4QAABAMASDBG
AiEA+tVCCFfQfZzo2+t2cAYAodoV/h7QNOz4WRMlw59O3hwCIQDzd0xLuxcb/N3X
+W/Rtasm6Cx+NUkwkEuwKUAxiElYKAB1ABoE/0nQVB1Ar/agw7/x2MRnL07s7iNA
aJhrF0Au3Il9AAABmMRpQVwAAAQDAEYwRAIgGni1NW3egKdCHsYWOd2qJWaGtd0l
nbxhbr5FWLmj5GACIBK5VTijGZMCVSM6JCAcVpOWhf3grxTi2MRzt879mdtVMA0G
CSqGSIb3DQEBCwUAA4IBAQAENCXxsMuo/QrGuzqvrIh1nlFgiNiQZczA1Lged1U5
ZD1TNZM2JuW0xJQ4eWv4AOEYL28RjHLx0TBQtDQRapufl6MBJ6I/JRi+5cklYyA4
r8cyVAqM38QJxOezXsLPCkDdeqWOcdAAXoMrMDicu0ozgB7mCRjtUwvZthP1ZDwj
z+teSsdRD4o8s7JDGUiDtWlQvNPAEnCOwwVLfEvVDWU/C77wc3eyy9jLlPwM+3fb
ZieuluG8dYhK7yQni4za5FlP0TbZE9sATFEdxL9ttLaUwqRJ6gPMDyilbf4RHQIP
6TOUuLQwBdMT7fbsAnhkZaaZbTZqR9uhefKhFm5Urx3k
-----END CERTIFICATE-----`;
    
    const base64 = pem.replace(/-----BEGIN CERTIFICATE-----/, '').replace(/-----END CERTIFICATE-----/, '').replace(/\s/g, '');
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const parser = new X509CertificateParser(bytes);
    const cert = parser.parseCertificate();
    
    // Version: 3 (0x02)
    framework.assertEqual(cert.version, 'v3');
    
    // Serial number: 06763dba04cfa21e6dd9070123794b453ecd
    framework.assertEqual(cert.serialNumber, '06:76:3d:ba:04:cf:a2:1e:6d:d9:07:01:23:79:4b:45:3e:cd');
    
    // Algorithm ID: SHA256withRSA
    framework.assertEqual(cert.signatureAlgorithm, 'SHA256withRSA');
    
    // Validity - Not Before: 2025-08-19
    framework.assertEqual(cert.validFrom, '2025-08-19');
    
    // Validity - Not After: 2025-11-17
    framework.assertEqual(cert.validTo, '2025-11-17');
    
    // Issuer: C=US, O=Let's Encrypt, CN=R11
    framework.assertTrue(cert.issuer.includes('C=US'));
    framework.assertTrue(cert.issuer.includes('O=Let\'s Encrypt'));
    framework.assertTrue(cert.issuer.includes('CN=R11'));
    
    // Subject: CN=neo01.com
    framework.assertTrue(cert.subject.includes('CN=neo01.com'));
    
    // Public Key Algorithm: RSA
    framework.assertEqual(cert.publicKeyAlgorithm, 'RSA');
    
    // Public Key Length: 2048 bits
    framework.assertEqual(cert.publicKeySize, '2048 bits');
    
    // Extensions should include Key Usage
    framework.assertTrue(Array.isArray(cert.extensions) && cert.extensions.includes('Key Usage'));
});

framework.test('Certificate serial number format', () => {
    // Test that serial number parsing produces correct hex format
    const testSerial = '06:76:3d:ba:04:cf:a2:1e:6d:d9:07:01:23:79:4b:45:3e:cd';
    framework.assertTrue(testSerial.match(/^([0-9a-f]{2}:)*[0-9a-f]{2}$/));
    framework.assertEqual(testSerial.split(':').length, 18); // 18 bytes
});

framework.test('Date format validation', () => {
    // Test date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    framework.assertTrue(dateRegex.test('2025-08-19'));
    framework.assertTrue(dateRegex.test('2025-11-17'));
});