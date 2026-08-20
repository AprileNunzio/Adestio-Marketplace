'use strict';

const fs = require('fs');
const path = require('path');
const scanner = require('./source_scanner');

const APP_ROOT = path.join(__dirname, '..');
const MAX_LINES = 500;

const contract = require(path.join(APP_ROOT, 'core', 'contract.json'));
const catalogue = require(path.join(APP_ROOT, 'core', 'permissions.json'));

const violations = [];

function report(category, detail) {
    violations.push({ category, detail });
}

function verifyPermissionCatalogue() {
    const ids = new Set();
    catalogue.forEach(entry => {
        if (!entry.id || !entry.label) report('PERMESSI', `Voce incompleta: ${JSON.stringify(entry)}`);
        if (ids.has(entry.id)) report('PERMESSI', `Permesso duplicato: ${entry.id}`);
        ids.add(entry.id);
    });
    return ids;
}

function verifyActionPermissions(permissionIds) {
    Object.entries(contract.actions).forEach(([actionId, spec]) => {
        if (!spec.permission) {
            report('CONTRATTO', `Azione senza permesso: ${actionId}`);
            return;
        }
        if (!permissionIds.has(spec.permission)) {
            report('CONTRATTO', `Azione "${actionId}" richiede permesso inesistente "${spec.permission}"`);
        }
    });
}

function verifyHandlers() {
    const handlersDir = path.join(APP_ROOT, 'backend', 'handlers');
    if (!fs.existsSync(handlersDir)) {
        report('HANDLER', 'Cartella backend/handlers assente');
        return;
    }
    const loaded = new Map();
    Object.entries(contract.actions).forEach(([actionId, spec]) => {
        if (!loaded.has(spec.handler)) {
            const file = path.join(handlersDir, `${spec.handler}.js`);
            if (!fs.existsSync(file)) {
                loaded.set(spec.handler, null);
                report('HANDLER', `File mancante: backend/handlers/${spec.handler}.js`);
            } else {
                try {
                    loaded.set(spec.handler, require(file));
                } catch (error) {
                    loaded.set(spec.handler, null);
                    report('HANDLER', `Import fallito per ${spec.handler}.js: ${error.message}`);
                }
            }
        }
        const handler = loaded.get(spec.handler);
        if (handler && typeof handler[spec.method] !== 'function') {
            report('HANDLER', `Azione "${actionId}" punta a ${spec.handler}.${spec.method} inesistente`);
        }
    });
}

function verifyFrontendCalls() {
    const uiDir = path.join(APP_ROOT, 'ui');
    if (!fs.existsSync(uiDir)) return;
    scanner.collectFiles(uiDir, '.js').forEach(file => {
        const source = fs.readFileSync(file, 'utf8');
        scanner.extractCalls(source).forEach(actionId => {
            if (!contract.actions[actionId]) {
                report('UI', `${path.relative(APP_ROOT, file)} invoca azione non dichiarata: ${actionId}`);
            }
        });
    });
}

function verifyManifest() {
    const manifestPath = path.join(APP_ROOT, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.id !== contract.appId) {
        report('MANIFEST', `manifest.id "${manifest.id}" diverso da contract.appId "${contract.appId}"`);
    }
    if (!manifest.ipc || manifest.ipc.namespace !== contract.ipcNamespace) {
        report('MANIFEST', `ipc.namespace diverso da contract.ipcNamespace "${contract.ipcNamespace}"`);
    }
    if (!manifest.db || manifest.db.namespace !== contract.dbNamespace) {
        report('MANIFEST', `db.namespace diverso da contract.dbNamespace "${contract.dbNamespace}"`);
    }
    const declared = (manifest.rbacPermissions || []).map(p => p.id).sort();
    const expected = catalogue.map(p => p.id).sort();
    if (JSON.stringify(declared) !== JSON.stringify(expected)) {
        report('MANIFEST', 'rbacPermissions non allineato a core/permissions.json (esegui tools/sync_manifest.js)');
    }
    (manifest.permissions || []).forEach(scope => {
        if (typeof scope !== 'string') {
            report('MANIFEST', `permissions deve contenere solo stringhe di scope: ${JSON.stringify(scope)}`);
        }
    });
}

function verifyCodeStandards() {
    const targets = [
        path.join(APP_ROOT, 'backend'),
        path.join(APP_ROOT, 'ui'),
        path.join(APP_ROOT, 'tools')
    ].filter(fs.existsSync);

    const rootFiles = ['app.js', 'backend.js', 'migrations.js']
        .map(name => path.join(APP_ROOT, name))
        .filter(fs.existsSync);

    const files = targets.reduce(
        (acc, dir) => acc.concat(scanner.collectFiles(dir, '.js')),
        rootFiles
    ).concat(
        scanner.collectFiles(path.join(APP_ROOT, 'core'), '.json'),
        scanner.collectFiles(path.join(APP_ROOT, 'css'), '.css')
    );

    files.forEach(file => {
        const relative = path.relative(APP_ROOT, file);
        const source = fs.readFileSync(file, 'utf8');
        const lines = scanner.countLines(source);
        if (lines > MAX_LINES) {
            report('STANDARD', `${relative}: ${lines} righe (limite ${MAX_LINES})`);
        }
        if (file.endsWith('.json')) return;
        const comments = scanner.findComments(source);
        if (comments.length > 0) {
            report('STANDARD', `${relative}: commenti alle righe ${comments.slice(0, 8).join(', ')}`);
        }
    });
    return files.length;
}

function main() {
    const permissionIds = verifyPermissionCatalogue();
    verifyActionPermissions(permissionIds);
    verifyHandlers();
    verifyFrontendCalls();
    verifyManifest();
    const scanned = verifyCodeStandards();

    const actionCount = Object.keys(contract.actions).length;
    console.log(`Azioni dichiarate: ${actionCount}`);
    console.log(`Permessi dichiarati: ${catalogue.length}`);
    console.log(`File analizzati: ${scanned}`);

    if (violations.length === 0) {
        console.log('\nESITO: contratto coerente, standard rispettati.');
        process.exit(0);
    }

    const grouped = violations.reduce((acc, item) => {
        acc[item.category] = acc[item.category] || [];
        acc[item.category].push(item.detail);
        return acc;
    }, {});

    console.log(`\nESITO: ${violations.length} violazioni\n`);
    Object.entries(grouped).forEach(([category, items]) => {
        console.log(`[${category}] ${items.length}`);
        items.forEach(item => console.log(`   - ${item}`));
        console.log('');
    });
    process.exit(1);
}

main();
