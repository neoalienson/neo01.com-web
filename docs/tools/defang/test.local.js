const Defanger = require('./defang.local.js');

describe('Defanger', () => {
    describe('defang', () => {
        it('should defang URL with all options enabled', () => {
            const input = 'http://example.com:8080/path';
            const expected = 'hxxp[://]example[.]com[:]8080/path';
            const result = Defanger.defang(input);
            expect(result).toBe(expected);
        });

        it('should defang HTTPS URL', () => {
            const input = 'https://malicious.site:443';
            const expected = 'hxxps[://]malicious[.]site[:]443';
            const result = Defanger.defang(input);
            expect(result).toBe(expected);
        });

        it('should defang IP address', () => {
            const input = '192.168.1.1:80';
            const expected = '192[.]168[.]1[.]1[:]80';
            const result = Defanger.defang(input);
            expect(result).toBe(expected);
        });

        it('should defang with only replaceDots enabled', () => {
            const input = 'http://example.com:8080';
            const expected = 'http://example[.]com:8080';
            const result = Defanger.defang(input, {
                replaceDots: true,
                replaceHttp: false,
                replaceProtocol: false,
                replacePorts: false
            });
            expect(result).toBe(expected);
        });

        it('should defang with only replaceHttp enabled', () => {
            const input = 'http://example.com:8080';
            const expected = 'hxxp://example.com:8080';
            const result = Defanger.defang(input, {
                replaceDots: false,
                replaceHttp: true,
                replaceProtocol: false,
                replacePorts: false
            });
            expect(result).toBe(expected);
        });

        it('should defang with only replaceProtocol enabled', () => {
            const input = 'http://example.com:8080';
            const expected = 'http[://]example.com:8080';
            const result = Defanger.defang(input, {
                replaceDots: false,
                replaceHttp: false,
                replaceProtocol: true,
                replacePorts: false
            });
            expect(result).toBe(expected);
        });

        it('should defang with only replacePorts enabled', () => {
            const input = 'http://example.com:8080';
            const expected = 'http://example.com[:]8080';
            const result = Defanger.defang(input, {
                replaceDots: false,
                replaceHttp: false,
                replaceProtocol: false,
                replacePorts: true
            });
            expect(result).toBe(expected);
        });

        it('should handle multiple URLs', () => {
            const input = 'Visit http://site1.com:80 or https://site2.org:443';
            const expected = 'Visit hxxp[://]site1[.]com[:]80 or hxxps[://]site2[.]org[:]443';
            const result = Defanger.defang(input);
            expect(result).toBe(expected);
        });

        it('should preserve non-port colons', () => {
            const input = 'Time: 12:30 URL: http://test.com:8080';
            const expected = 'Time: 12:30 URL: hxxp[://]test[.]com[:]8080';
            const result = Defanger.defang(input);
            expect(result).toBe(expected);
        });
    });

    describe('refang', () => {
        it('should refang URL with all options enabled', () => {
            const input = 'hxxp[://]example[.]com[:]8080/path';
            const expected = 'http://example.com:8080/path';
            const result = Defanger.refang(input);
            expect(result).toBe(expected);
        });

        it('should refang HTTPS URL', () => {
            const input = 'hxxps[://]malicious[.]site[:]443';
            const expected = 'https://malicious.site:443';
            const result = Defanger.refang(input);
            expect(result).toBe(expected);
        });

        it('should refang IP address', () => {
            const input = '192[.]168[.]1[.]1[:]80';
            const expected = '192.168.1.1:80';
            const result = Defanger.refang(input);
            expect(result).toBe(expected);
        });

        it('should refang with only replaceDots enabled', () => {
            const input = 'http://example[.]com:8080';
            const expected = 'http://example.com:8080';
            const result = Defanger.refang(input, {
                replaceDots: true,
                replaceHttp: false,
                replaceProtocol: false,
                replacePorts: false
            });
            expect(result).toBe(expected);
        });

        it('should refang with only replaceHttp enabled', () => {
            const input = 'hxxp://example.com:8080';
            const expected = 'http://example.com:8080';
            const result = Defanger.refang(input, {
                replaceDots: false,
                replaceHttp: true,
                replaceProtocol: false,
                replacePorts: false
            });
            expect(result).toBe(expected);
        });

        it('should refang with only replaceProtocol enabled', () => {
            const input = 'http[://]example.com:8080';
            const expected = 'http://example.com:8080';
            const result = Defanger.refang(input, {
                replaceDots: false,
                replaceHttp: false,
                replaceProtocol: true,
                replacePorts: false
            });
            expect(result).toBe(expected);
        });

        it('should refang with only replacePorts enabled', () => {
            const input = 'http://example.com[:]8080';
            const expected = 'http://example.com:8080';
            const result = Defanger.refang(input, {
                replaceDots: false,
                replaceHttp: false,
                replaceProtocol: false,
                replacePorts: true
            });
            expect(result).toBe(expected);
        });

        it('should handle multiple URLs', () => {
            const input = 'Visit hxxp[://]site1[.]com[:]80 or hxxps[://]site2[.]org[:]443';
            const expected = 'Visit http://site1.com:80 or https://site2.org:443';
            const result = Defanger.refang(input);
            expect(result).toBe(expected);
        });

        it('should be inverse of defang', () => {
            const original = 'http://example.com:8080/path?query=value';
            const defanged = Defanger.defang(original);
            const refanged = Defanger.refang(defanged);
            expect(refanged).toBe(original);
        });

        it('should handle mixed defanged and normal text', () => {
            const input = 'Check hxxp[://]bad[.]site[.]com[:]8080 and normal text';
            const expected = 'Check http://bad.site.com:8080 and normal text';
            const result = Defanger.refang(input);
            expect(result).toBe(expected);
        });
    });

    describe('round-trip conversion', () => {
        it('should maintain data integrity through defang and refang', () => {
            const testCases = [
                'http://example.com',
                'https://test.org:443/path',
                '192.168.1.1:8080',
                'ftp://files.server.net:21',
                'http://sub.domain.example.com:3000/api/v1'
            ];

            testCases.forEach(original => {
                const defanged = Defanger.defang(original);
                const refanged = Defanger.refang(defanged);
                expect(refanged).toBe(original);
            });
        });
    });
});
