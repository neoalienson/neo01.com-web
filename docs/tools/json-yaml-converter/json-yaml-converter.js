class JsonYamlConverter {
    static jsonToYaml(jsonString, prettyFormat = true) {
        try {
            const obj = JSON.parse(jsonString);
            return this.objectToYaml(obj, 0);
        } catch (error) {
            throw new Error('Invalid JSON format');
        }
    }

    static yamlToJson(yamlString, prettyFormat = true) {
        try {
            const obj = this.parseYaml(yamlString);
            return prettyFormat ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
        } catch (error) {
            throw new Error('Invalid YAML format');
        }
    }

    static objectToYaml(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        
        if (obj === null) return 'null';
        if (typeof obj === 'boolean') return obj.toString();
        if (typeof obj === 'number') return obj.toString();
        if (typeof obj === 'string') {
            if (obj.includes('\n') || obj.includes('"') || obj.includes("'")) {
                return `"${obj.replace(/"/g, '\\"')}"`;
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            return obj.map(item => `${spaces}- ${this.objectToYaml(item, indent + 1).replace(/^\s+/, '')}`).join('\n');
        }

        if (typeof obj === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) return '{}';
            
            return keys.map(key => {
                const value = obj[key];
                const yamlValue = this.objectToYaml(value, indent + 1);
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    return `${spaces}${key}:\n${yamlValue}`;
                } else if (Array.isArray(value) && value.length > 0) {
                    return `${spaces}${key}:\n${yamlValue}`;
                } else {
                    return `${spaces}${key}: ${yamlValue}`;
                }
            }).join('\n');
        }

        return obj.toString();
    }

    static parseYaml(yamlString) {
        const lines = yamlString.trim().split('\n');
        const result = {};
        const stack = [{ obj: result, indent: -1 }];

        for (let line of lines) {
            if (line.trim() === '' || line.trim().startsWith('#')) continue;

            const indent = line.length - line.trimLeft().length;
            const trimmed = line.trim();

            while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
                stack.pop();
            }

            const current = stack[stack.length - 1].obj;

            if (trimmed.startsWith('- ')) {
                const value = trimmed.substring(2).trim();
                if (!Array.isArray(current)) {
                    throw new Error('Invalid YAML: array item without array context');
                }
                
                if (value.includes(':')) {
                    const obj = {};
                    current.push(obj);
                    stack.push({ obj, indent });
                    this.parseKeyValue(value, obj);
                } else {
                    current.push(this.parseValue(value));
                }
            } else if (trimmed.includes(':')) {
                this.parseKeyValue(trimmed, current, stack, indent);
            }
        }

        return result;
    }

    static parseKeyValue(line, obj, stack = null, indent = 0) {
        const colonIndex = line.indexOf(':');
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();

        if (value === '') {
            obj[key] = {};
            if (stack) stack.push({ obj: obj[key], indent });
        } else if (value === '[]') {
            obj[key] = [];
        } else if (value === '{}') {
            obj[key] = {};
        } else {
            obj[key] = this.parseValue(value);
        }
    }

    static parseValue(value) {
        if (value === 'null') return null;
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value.startsWith('"') && value.endsWith('"')) {
            return value.slice(1, -1).replace(/\\"/g, '"');
        }
        if (value.startsWith("'") && value.endsWith("'")) {
            return value.slice(1, -1);
        }
        if (!isNaN(value) && !isNaN(parseFloat(value))) {
            return parseFloat(value);
        }
        return value;
    }
}

function convertToYaml() {
    const input = document.getElementById('inputText').value;
    const prettyFormat = document.getElementById('prettyFormat').checked;
    const output = document.getElementById('outputText');

    if (!input.trim()) {
        showMessage('Please enter JSON to convert', 'error');
        return;
    }

    try {
        const yaml = JsonYamlConverter.jsonToYaml(input, prettyFormat);
        output.value = yaml;
        showMessage('JSON converted to YAML successfully', 'success');
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

function convertToJson() {
    const input = document.getElementById('inputText').value;
    const prettyFormat = document.getElementById('prettyFormat').checked;
    const output = document.getElementById('outputText');

    if (!input.trim()) {
        showMessage('Please enter YAML to convert', 'error');
        return;
    }

    try {
        const json = JsonYamlConverter.yamlToJson(input, prettyFormat);
        output.value = json;
        showMessage('YAML converted to JSON successfully', 'success');
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

function copyOutput() {
    const output = document.getElementById('outputText');
    if (!output.value) {
        showMessage('No output to copy', 'error');
        return;
    }
    
    output.select();
    document.execCommand('copy');
    showMessage('Copied to clipboard', 'success');
}

function showMessage(text, type) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = type;
    setTimeout(() => {
        message.textContent = '';
        message.className = '';
    }, 3000);
}

document.getElementById('inputText').addEventListener('input', function() {
    const output = document.getElementById('outputText');
    if (output.value) {
        output.value = '';
        document.getElementById('message').textContent = '';
    }
});

document.getElementById('prettyFormat').addEventListener('change', function() {
    const output = document.getElementById('outputText');
    if (output.value) {
        output.value = '';
        document.getElementById('message').textContent = '';
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = JsonYamlConverter;
}