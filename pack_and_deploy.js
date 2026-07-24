require('dotenv').config({ path: '../Adestio/.env' });
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const crypto = require('crypto');

const APP_DIR = process.argv[2] || 'App-PresaDiServizio';
const IS_PROD = process.argv.includes('--prod');
const IS_TEST = process.argv.includes('--test');

if (!IS_PROD && !IS_TEST) {
    console.error('Uso: node pack_and_deploy.js <AppFolder> [--test | --prod]');
    process.exit(1);
}

function computeFileHash(filePath) {
    try {
        if (!fs.existsSync(filePath)) return null;
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (e) {
        return null;
    }
}

async function runDeploy() {
    try {
        const appPath = path.join(__dirname, APP_DIR);
        if (!fs.existsSync(appPath)) {
            console.error(`Cartella ${APP_DIR} non trovata.`);
            process.exit(1);
        }

        const manifestPath = path.join(appPath, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            console.error(`manifest.json non trovato in ${APP_DIR}.`);
            process.exit(1);
        }

        let manifest = require(manifestPath);
        let version = manifest.version || '1.0.0';

        if (IS_PROD) {
            const parts = version.split('.');
            parts[2] = parseInt(parts[2] || 0) + 1;
            version = parts.join('.');
            manifest.version = version;
        }

        manifest.integrity_hash = computeFileHash(manifestPath);
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        const zipName = `${manifest.id}_v${version}.zip`;
        const zipPath = path.join(__dirname, zipName);

        const zip = new AdmZip();
        zip.addLocalFolder(appPath);
        zip.writeZip(zipPath);

        const zipBuffer = fs.readFileSync(zipPath);
        const zipHash = crypto.createHash('sha256').update(zipBuffer).digest('hex');

        if (IS_TEST) {
            const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
            const adestioUserData = path.join(appData, 'NunzioTech', 'Adestio', 'installed_apps', manifest.id);
            
            if (fs.existsSync(adestioUserData)) fs.rmSync(adestioUserData, { recursive: true, force: true });
            fs.mkdirSync(adestioUserData, { recursive: true });
            
            const testZip = new AdmZip(zipPath);
            testZip.extractAllTo(adestioUserData, true);
        }

        if (IS_PROD) {
            const client = new ftp.Client();
            try {
                if (!process.env.FTP_HOST) throw new Error('Credenziali FTP mancanti nel .env di Adestio');
                
                await client.access({
                    host: process.env.FTP_HOST,
                    user: process.env.FTP_USER,
                    password: process.env.FTP_PASS,
                    secure: false
                });
                
                await client.uploadFrom(zipPath, zipName);

                const marketplacePath = path.join(__dirname, 'marketplace.json');
                let marketData = JSON.parse(fs.readFileSync(marketplacePath, 'utf-8'));
                
                const appIndex = marketData.findIndex(a => a.id === manifest.id);
                const entry = {
                    id: manifest.id,
                    name: manifest.name,
                    version: manifest.version,
                    minCoreVersion: manifest.minCoreVersion || '1.0.0',
                    api_version: manifest.api_version || '1.0',
                    description: manifest.description,
                    icon: manifest.icon,
                    downloadUrl: `https://nunziotech.it/software/adestio/${zipName}`,
                    sha256: zipHash,
                    ui_injections: manifest.ui_injections || []
                };

                if (appIndex >= 0) {
                    marketData[appIndex] = { ...marketData[appIndex], ...entry };
                } else {
                    marketData.push(entry);
                }
                
                fs.writeFileSync(marketplacePath, JSON.stringify(marketData, null, 2));

                await client.uploadFrom(marketplacePath, 'marketplace.json');

            } catch (e) {
                console.error('Errore durante il deploy FTP:', e);
            } finally {
                client.close();
            }
        }
    } catch (e) {
        console.error('Errore generale runDeploy:', e);
    }
}

runDeploy();
