// PNG Metadata Checker Tests
if (typeof framework !== 'undefined') {
    // Test PNG signature validation
    framework.test('PNG signature validation', () => {
        const checker = new PngMetadataChecker();
        
        // Valid PNG signature
        const validSignature = new DataView(new ArrayBuffer(8));
        [137, 80, 78, 71, 13, 10, 26, 10].forEach((byte, i) => {
            validSignature.setUint8(i, byte);
        });
        
        const validResult = checker.checkPngSignature(validSignature);
        framework.assert(validResult.valid === true, 'Valid PNG signature should be recognized');
        
        // Invalid PNG signature
        const invalidSignature = new DataView(new ArrayBuffer(8));
        [137, 80, 78, 71, 13, 10, 26, 11].forEach((byte, i) => {
            invalidSignature.setUint8(i, byte);
        });
        
        const invalidResult = checker.checkPngSignature(invalidSignature);
        framework.assert(invalidResult.valid === false, 'Invalid PNG signature should be rejected');
    });
    
    // Test IHDR parsing
    framework.test('IHDR chunk parsing', () => {
        const checker = new PngMetadataChecker();
        
        // Create mock IHDR data: width=1920, height=1080, bit_depth=8, color_type=2, etc.
        const ihdrData = new DataView(new ArrayBuffer(13));
        ihdrData.setUint32(0, 1920);  // width
        ihdrData.setUint32(4, 1080);  // height
        ihdrData.setUint8(8, 8);      // bit depth
        ihdrData.setUint8(9, 2);      // color type (RGB)
        ihdrData.setUint8(10, 0);     // compression method
        ihdrData.setUint8(11, 0);     // filter method
        ihdrData.setUint8(12, 0);     // interlace method
        
        const result = checker.parseIHDR(ihdrData);
        
        framework.assert(result.width === 1920, 'Width should be parsed correctly');
        framework.assert(result.height === 1080, 'Height should be parsed correctly');
        framework.assert(result.bitDepth === 8, 'Bit depth should be parsed correctly');
        framework.assert(result.colorType === 2, 'Color type should be parsed correctly');
    });
    
    // Test text chunk parsing
    framework.test('tEXt chunk parsing', () => {
        const checker = new PngMetadataChecker();
        
        // Create mock tEXt data: "Title\0Test Image"
        const textData = 'Title\0Test Image';
        const buffer = new ArrayBuffer(textData.length);
        const view = new DataView(buffer);
        
        for (let i = 0; i < textData.length; i++) {
            view.setUint8(i, textData.charCodeAt(i));
        }
        
        const result = checker.parseText(view);
        
        framework.assert(result.Title === 'Test Image', 'Text chunk should be parsed correctly');
    });
    
    // Test time parsing
    framework.test('tIME chunk parsing', () => {
        const checker = new PngMetadataChecker();
        
        // Create mock tIME data: 2024-01-15 14:30:45
        const timeData = new DataView(new ArrayBuffer(7));
        timeData.setUint16(0, 2024);  // year
        timeData.setUint8(2, 1);      // month
        timeData.setUint8(3, 15);     // day
        timeData.setUint8(4, 14);     // hour
        timeData.setUint8(5, 30);     // minute
        timeData.setUint8(6, 45);     // second
        
        const result = checker.parseTime(timeData);
        
        framework.assert(result instanceof Date, 'Should return a Date object');
        framework.assert(result.getFullYear() === 2024, 'Year should be parsed correctly');
        framework.assert(result.getMonth() === 0, 'Month should be parsed correctly (0-based)');
        framework.assert(result.getDate() === 15, 'Day should be parsed correctly');
        framework.assert(result.getHours() === 14, 'Hour should be parsed correctly');
        framework.assert(result.getMinutes() === 30, 'Minute should be parsed correctly');
        framework.assert(result.getSeconds() === 45, 'Second should be parsed correctly');
    });
    
    // Test gamma parsing
    framework.test('gAMA chunk parsing', () => {
        const checker = new PngMetadataChecker();
        
        // Create mock gAMA data: gamma = 2.2 (stored as 220000)
        const gammaData = new DataView(new ArrayBuffer(4));
        gammaData.setUint32(0, 220000);
        
        const result = checker.parseGamma(gammaData);
        
        framework.assert(Math.abs(result - 2.2) < 0.01, 'Gamma should be parsed correctly');
    });
    
    // Test string reading utility
    framework.test('String reading utility', () => {
        const checker = new PngMetadataChecker();
        
        // Create test string data
        const testString = 'Hello World';
        const buffer = new ArrayBuffer(testString.length + 5);
        const view = new DataView(buffer);
        
        for (let i = 0; i < testString.length; i++) {
            view.setUint8(i + 2, testString.charCodeAt(i));
        }
        
        const result = checker.readString(view, 2, testString.length);
        
        framework.assert(result === testString, 'String should be read correctly');
    });
    
    // Test case converter integration
    framework.test('Case converter integration', () => {
        const checker = new PngMetadataChecker();
        
        // Test that case converter is available and working
        framework.assert(typeof checker.toTitleCase === 'function', 'Case converter should be available');
        
        const result = checker.toTitleCase('test metadata key');
        framework.assert(result === 'Test Metadata Key', 'Case converter should format keys correctly');
    });
    
    // Test error handling
    framework.test('Error handling', () => {
        const checker = new PngMetadataChecker();
        
        // Test invalid file type handling
        const mockFile = {
            type: 'image/jpeg',
            name: 'test.jpg',
            size: 1000
        };
        
        // Mock DOM elements for testing
        checker.error = { style: { display: 'none' }, textContent: '' };
        checker.output = { style: { display: 'none' } };
        checker.fileInfo = { style: { display: 'none' } };
        
        // This should trigger an error
        checker.processFile(mockFile);
        
        framework.assert(checker.error.style.display === 'block', 'Error should be displayed for invalid file type');
        framework.assert(checker.error.textContent.includes('PNG'), 'Error message should mention PNG requirement');
    });
    
    // Test file info display
    framework.test('File info formatting', () => {
        const checker = new PngMetadataChecker();
        
        const mockFile = {
            name: 'test.png',
            size: 1048576, // 1MB
            lastModified: new Date('2024-01-15T10:30:00').getTime()
        };
        
        // Mock DOM element
        checker.fileInfo = { innerHTML: '', style: { display: 'none' } };
        
        checker.showFileInfo(mockFile);
        
        framework.assert(checker.fileInfo.innerHTML.includes('test.png'), 'File name should be displayed');
        framework.assert(checker.fileInfo.innerHTML.includes('1 MB'), 'File size should be formatted correctly');
        framework.assert(checker.fileInfo.style.display === 'block', 'File info should be visible');
    });
}