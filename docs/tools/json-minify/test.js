// JSON Minify Tests
framework.test('JSON prettify basic', () => {
    const input = '{"name":"John","age":30}';
    const parsed = JSON.parse(input);
    const result = JSON.stringify(parsed, null, 2);
    framework.assertTrue(result.includes('  "name": "John"'));
});

framework.test('JSON minify basic', () => {
    const input = '{\n  "name": "John",\n  "age": 30\n}';
    const parsed = JSON.parse(input);
    const result = JSON.stringify(parsed);
    framework.assertEqual(result, '{"name":"John","age":30}');
});