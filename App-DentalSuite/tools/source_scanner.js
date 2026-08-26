'use strict';

const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);

function collectFiles(root, extension) {
    const found = [];
    const walk = current => {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (SKIP_DIRS.has(entry.name)) continue;
                walk(path.join(current, entry.name));
            } else if (entry.name.endsWith(extension)) {
                found.push(path.join(current, entry.name));
            }
        }
    };
    walk(root);
    return found;
}

function stripLiterals(source) {
    let output = '';
    let quote = null;
    for (let i = 0; i < source.length; i += 1) {
        const char = source[i];
        const previous = i > 0 ? source[i - 1] : '';
        if (quote) {
            if (char === quote && previous !== '\\') quote = null;
            output += ' ';
            continue;
        }
        if (char === '"' || char === "'" || char === '`') {
            quote = char;
            output += ' ';
            continue;
        }
        output += char;
    }
    return output;
}

function findComments(source) {
    const stripped = stripLiterals(source);
    const lines = stripped.split('\n');
    const hits = [];
    lines.forEach((line, index) => {
        const blockAt = line.indexOf('/*');
        if (blockAt !== -1) {
            hits.push(index + 1);
            return;
        }
        const lineAt = line.indexOf('//');
        if (lineAt !== -1 && line[lineAt - 1] !== ':') {
            hits.push(index + 1);
        }
    });
    return hits;
}

function countLines(source) {
    return source.split('\n').length;
}

function extractCalls(source) {
    const matches = source.matchAll(/\bcall\(\s*'([^']+)'/g);
    return [...matches].map(match => match[1]);
}

module.exports = { collectFiles, findComments, countLines, extractCalls, stripLiterals };
