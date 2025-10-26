// URL Parser Tests
framework.test('URL parsing', () => {
    const url = 'https://example.com:8080/path?param=value#hash';
    const urlObj = new URL(url);
    framework.assertEqual(urlObj.protocol, 'https:');
    framework.assertEqual(urlObj.hostname, 'example.com');
    framework.assertEqual(urlObj.port, '8080');
});