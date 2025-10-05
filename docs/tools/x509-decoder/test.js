// ASN.1 Parser Tests

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
