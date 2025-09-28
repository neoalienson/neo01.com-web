// Node.js Test Runner for ASN.1 Parser
const fs = require('fs');
const path = require('path');

// Load test framework
const TestFramework = require('../test-framework.js');
const framework = new TestFramework();

// Load ASN.1 Parser
const ASN1Parser = require('./asn1-parser-node.js');
const X509CertificateParser = require('./asn1js-parser.js');
global.ASN1Parser = ASN1Parser;
global.X509CertificateParser = X509CertificateParser;

// Mock atob for Node.js
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Load and run tests
const testCode = fs.readFileSync(path.join(__dirname, 'test.js'), 'utf8');
eval(testCode);

// Run the tests
framework.run();