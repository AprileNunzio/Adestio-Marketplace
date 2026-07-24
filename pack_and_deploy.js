require('dotenv').config({ path: '../Adestio/.env' }); // Prende l'FTP dal progetto principale
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const APP_DIR = process.argv[2] || 'App-PresaDiServizio';
const IS_PROD = process.argv.includes('--prod');
const IS_TEST = process.argv.includes('--test');

if (!IS_PROD && !IS_TEST) {
    console.error('Uso: node pack_and_deploy.js <AppFolder> [--test | --prod]');
    process.exit(1);
}

async function runDeploy() {
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

    // Auto-incremento della patch version solo in PROD
    if (IS_PROD) {
        const parts = version.split('.');
        parts[2] = parseInt(parts[2] || 0) + 1;
        version = parts.join('.');
        manifest.version = version;
        
        // Salva il nuovo manifest.json
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
        console.log(`[PROD] Versione auto-incrementata a ${version} in ${manifestPath}`);
    }

    const zipName = `${manifest.id}_v${version}.zip`;
    const zipPath = path.join(__dirname, zipName);

    console.log(`[PACK] Creazione archivio ${zipName}...`);
    const zip = new AdmZip();
    zip.addLocalFolder(appPath);
    zip.writeZip(zipPath);
    console.log(`[PACK] Zip completato con successo: ${zipPath}`);

    if (IS_TEST) {
        console.log(`[TEST] Installazione locale in corso...`);
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
        const adestioUserData = path.join(appData, 'NunzioTech', 'Adestio', 'installed_apps', manifest.id);
        
        if (fs.existsSync(adestioUserData)) fs.rmSync(adestioUserData, { recursive: true, force: true });
        fs.mkdirSync(adestioUserData, { recursive: true });
        
        const testZip = new AdmZip(zipPath);
        testZip.extractAllTo(adestioUserData, true);
        console.log(`[TEST] ✅ App estratta e pronta per il test in ${adestioUserData}`);
    }

    if (IS_PROD) {
        console.log(`[PROD] Connessione FTP in corso...`);
        const client = new ftp.Client();
        try {
            if (!process.env.FTP_HOST) throw new Error('Credenziali FTP mancanti nel .env di Adestio');
            
            await client.access({
                host: process.env.FTP_HOST,
                user: process.env.FTP_USER,
                password: process.env.FTP_PASS,
                secure: false
            });
            
            console.log(`[PROD] Uploading ${zipName}...`);
            await client.uploadFrom(zipPath, zipName);
            console.log(`[PROD] ✅ Upload FTP completato.`);

            // Aggiorna il marketplace.json
            console.log(`[PROD] Aggiornamento marketplace.json...`);
            const marketplacePath = path.join(__dirname, 'marketplace.json');
            let marketData = JSON.parse(fs.readFileSync(marketplacePath, 'utf-8'));
            
            const appIndex = marketData.findIndex(a => a.id === manifest.id);
            const entry = {
                id: manifest.id,
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
                icon: manifest.icon,
                downloadUrl: `https://nunziotech.it/software/adestio/${zipName}`,
                ui_injections: manifest.ui_injections || []
            };

            if (appIndex >= 0) {
                marketData[appIndex] = { ...marketData[appIndex], ...entry };
            } else {
                marketData.push(entry);
            }
            
            fs.writeFileSync(marketplacePath, JSON.stringify(marketData, null, 2));
            console.log(`[PROD] ✅ marketplace.json aggiornato.`);

            // Auto-push su GitHub e Creazione Tag (Release)
            console.log(`[PROD] Avvio auto-commit, tag e push su GitHub...`);
            const { execSync } = require('child_process');
            execSync(`git add .`);
            execSync(`git commit -m "chore: release ${manifest.id} v${version}"`);
            try { execSync(`git tag v${version}`); } catch(e) {} // Ignora se il tag esiste già
            execSync(`git push`);
            execSync(`git push --tags`);
            console.log(`[PROD] ✅ Release v${version} (Commit & Tag) pushata con successo su GitHub!`);

        } catch (e) {
            console.error('[PROD] ❌ Errore durante il deploy:', e);
        } finally {
            client.close();
        }
    }
}

runDeploy();
