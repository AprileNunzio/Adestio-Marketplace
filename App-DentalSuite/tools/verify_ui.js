'use strict';

const fs = require('fs');
const path = require('path');
const scanner = require('./source_scanner');

const APP_ROOT = path.join(__dirname, '..');
const violazioni = [];

function segnala(categoria, dettaglio) {
    violazioni.push({ categoria, dettaglio });
}

function moduliSorgente() {
    return scanner.collectFiles(path.join(APP_ROOT, 'ui'), '.js')
        .concat([path.join(APP_ROOT, 'app.js')]);
}

function estraiImport(sorgente) {
    const risultati = [];
    const espressione = /import\s+([^'"]+?)\s+from\s+['"]([^'"]+)['"]/g;
    let trovato = espressione.exec(sorgente);
    while (trovato) {
        risultati.push({ clausola: trovato[1].trim(), percorso: trovato[2] });
        trovato = espressione.exec(sorgente);
    }
    return risultati;
}

function estraiEsportazioni(sorgente) {
    const nomi = new Set();
    [...sorgente.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)]
        .forEach(trovato => nomi.add(trovato[1]));
    [...sorgente.matchAll(/export\s+(?:const|let|var|class)\s+([A-Za-z0-9_$]+)/g)]
        .forEach(trovato => nomi.add(trovato[1]));
    [...sorgente.matchAll(/export\s*\{([^}]+)\}/g)].forEach(trovato => {
        trovato[1].split(',').forEach(voce => {
            const parti = voce.split(/\s+as\s+/);
            const nome = (parti[1] || parti[0]).trim();
            if (nome) nomi.add(nome);
        });
    });
    if (/export\s+default/.test(sorgente)) nomi.add('default');
    return nomi;
}

function nomiImportati(clausola) {
    if (clausola.startsWith('*')) return { namespace: true, nomi: [] };
    const graffe = /\{([^}]*)\}/.exec(clausola);
    if (!graffe) return { namespace: false, nomi: ['default'] };
    const nomi = graffe[1]
        .split(',')
        .map(voce => voce.split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
    return { namespace: false, nomi };
}

function identificatoriLocali(clausola) {
    if (clausola.startsWith('*')) {
        const alias = /as\s+([A-Za-z0-9_$]+)/.exec(clausola);
        return alias ? [alias[1]] : [];
    }
    const graffe = /\{([^}]*)\}/.exec(clausola);
    if (!graffe) return [clausola.trim()];
    return graffe[1]
        .split(',')
        .map(voce => {
            const parti = voce.split(/\s+as\s+/);
            return (parti[1] || parti[0]).trim();
        })
        .filter(Boolean);
}

function verificaModulo(file, cache) {
    const relativo = path.relative(APP_ROOT, file);
    const sorgente = fs.readFileSync(file, 'utf8');
    const corpo = sorgente.replace(/import\s+[^'"]+?\s+from\s+['"][^'"]+['"];?/g, '');

    estraiImport(sorgente).forEach(voce => {
        if (!voce.percorso.startsWith('.')) return;
        const risolto = path.resolve(path.dirname(file), voce.percorso);
        if (!fs.existsSync(risolto)) {
            segnala('IMPORT', `${relativo}: percorso inesistente "${voce.percorso}"`);
            return;
        }
        if (!risolto.endsWith('.json')) {
            if (!cache.has(risolto)) {
                cache.set(risolto, estraiEsportazioni(fs.readFileSync(risolto, 'utf8')));
            }
            const disponibili = cache.get(risolto);
            const richiesti = nomiImportati(voce.clausola);
            if (!richiesti.namespace) {
                richiesti.nomi.forEach(nome => {
                    if (!disponibili.has(nome)) {
                        segnala('IMPORT', `${relativo}: "${nome}" non è esportato da ${voce.percorso}`);
                    }
                });
            }
        }
        identificatoriLocali(voce.clausola).forEach(nome => {
            const uso = new RegExp(`\\b${nome.replace(/\$/g, '\\$')}\\b`);
            if (!uso.test(corpo)) {
                segnala('INUTILIZZATO', `${relativo}: import "${nome}" mai usato`);
            }
        });
    });
}

function moduliRegistrati() {
    const registri = [
        path.join(APP_ROOT, 'ui', 'routes.js'),
        path.join(APP_ROOT, 'ui', 'views', 'contabilita.js'),
        path.join(APP_ROOT, 'ui', 'views', 'paziente', 'schede.js')
    ].filter(fs.existsSync);

    const riferimenti = [];
    registri.forEach(registro => {
        const sorgente = fs.readFileSync(registro, 'utf8');
        [...sorgente.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].forEach(trovato => {
            riferimenti.push({
                registro,
                file: path.resolve(path.dirname(registro), trovato[1]),
                specificato: trovato[1]
            });
        });
    });
    return riferimenti;
}

function verificaViste() {
    const registrati = moduliRegistrati();
    const percorsiRegistrati = new Set(registrati.map(voce => voce.file));

    registrati.forEach(voce => {
        const origine = path.relative(APP_ROOT, voce.registro);
        if (!fs.existsSync(voce.file)) {
            segnala('VISTA', `${origine}: vista registrata inesistente "${voce.specificato}"`);
            return;
        }
        const sorgente = fs.readFileSync(voce.file, 'utf8');
        if (!/export\s+default/.test(sorgente)) {
            segnala('VISTA', `${path.relative(APP_ROOT, voce.file)}: manca "export default"`);
            return;
        }
        if (!/rendi\s*:/.test(sorgente)) {
            segnala('VISTA', `${path.relative(APP_ROOT, voce.file)}: l'export default non espone "rendi"`);
        }
    });

    scanner.collectFiles(path.join(APP_ROOT, 'ui'), '.js').forEach(file => {
        if (percorsiRegistrati.has(file)) return;
        const sorgente = fs.readFileSync(file, 'utf8');
        if (!/export\s+/.test(sorgente)) {
            segnala('VISTA', `${path.relative(APP_ROOT, file)}: modulo senza alcun export`);
        }
    });

    return registrati.length;
}

function main() {
    const cache = new Map();
    const file = moduliSorgente();
    file.forEach(voce => verificaModulo(voce, cache));
    const registrate = verificaViste();

    console.log(`Moduli frontend analizzati: ${file.length} | viste registrate: ${registrate}`);
    if (violazioni.length === 0) {
        console.log('\nESITO: grafo degli import coerente, nessun simbolo mancante o inutilizzato.');
        process.exit(0);
    }

    const raggruppate = violazioni.reduce((acc, voce) => {
        acc[voce.categoria] = acc[voce.categoria] || [];
        acc[voce.categoria].push(voce.dettaglio);
        return acc;
    }, {});

    console.log(`\nESITO: ${violazioni.length} problemi\n`);
    Object.entries(raggruppate).forEach(([categoria, voci]) => {
        console.log(`[${categoria}] ${voci.length}`);
        voci.forEach(voce => console.log(`   - ${voce}`));
        console.log('');
    });
    process.exit(1);
}

main();
