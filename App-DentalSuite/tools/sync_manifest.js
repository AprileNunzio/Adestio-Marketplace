'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(APP_ROOT, 'manifest.json');

const contract = require(path.join(APP_ROOT, 'core', 'contract.json'));
const catalogue = require(path.join(APP_ROOT, 'core', 'permissions.json'));

function main() {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

    manifest.id = contract.appId;
    manifest.folder = contract.appId;
    manifest.ipc = { namespace: contract.ipcNamespace };
    manifest.db = { namespace: contract.dbNamespace, migrations: './migrations.js' };
    manifest.permissions = [`${contract.ipcNamespace}:*`, 'anagrafica:*'];
    manifest.rbacPermissions = catalogue.map(entry => ({
        id: entry.id,
        label: entry.label,
        default: entry.default === true
    }));

    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 4)}\n`, 'utf8');
    console.log(`manifest.json allineato: ${manifest.rbacPermissions.length} permessi RBAC, namespace "${contract.ipcNamespace}".`);
}

main();
