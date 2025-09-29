// JSON Validator Tests
framework.describe('JSON Validator', () => {
    let validator;
    
    framework.beforeEach(() => {
        // Create DOM elements for testing
        document.body.innerHTML = `
            <textarea id="inputJson"></textarea>
            <textarea id="outputJson"></textarea>
            <div id="inputStatus" class="status"></div>
            <div id="outputStatus" class="status"></div>
        `;
        
        validator = new JsonValidator();
    });
    
    framework.test('should validate valid JSON', () => {
        const input = document.getElementById('inputJson');
        const status = document.getElementById('inputStatus');
        
        input.value = '{"name": "test", "value": 123}';
        validator.validateInput();
        
        framework.assert(status.textContent === 'Valid JSON', 'Should show valid JSON message');
        framework.assert(status.className.includes('valid'), 'Should have valid class');
    });
    
    framework.test('should detect invalid JSON', () => {
        const input = document.getElementById('inputJson');
        const status = document.getElementById('inputStatus');
        
        input.value = '{"name": "test", "value":}';
        validator.validateInput();
        
        framework.assert(status.textContent.includes('Invalid JSON'), 'Should show invalid JSON message');
        framework.assert(status.className.includes('invalid'), 'Should have invalid class');
    });
    
    framework.test('should format JSON correctly', () => {
        const input = document.getElementById('inputJson');
        const output = document.getElementById('outputJson');
        
        input.value = '{"name":"test","value":123}';
        validator.formatJson();
        
        const expected = JSON.stringify({"name":"test","value":123}, null, 2);
        framework.assert(output.value === expected, 'Should format JSON with proper indentation');
    });
    
    framework.test('should minify JSON correctly', () => {
        const input = document.getElementById('inputJson');
        const output = document.getElementById('outputJson');
        
        input.value = `{
  "name": "test",
  "value": 123
}`;
        validator.minifyJson();
        
        framework.assert(output.value === '{"name":"test","value":123}', 'Should minify JSON to single line');
    });
    
    framework.test('should handle empty input', () => {
        const input = document.getElementById('inputJson');
        const status = document.getElementById('inputStatus');
        
        input.value = '';
        validator.validateInput();
        
        framework.assert(status.textContent === '', 'Should show no message for empty input');
    });
});